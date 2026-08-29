import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';
import type { AuthContextType, UserData as StellarData } from '../types';
import {
    isPasskeySupported,
    registerPasskeySmartWallet,
    loginWithPasskeyVault,
} from '../services/passkey';
import { getFriendbotUrl } from '../services/networkConfig';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(null);
    const [stellarData, setStellarData] = useState<StellarData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [passkeySupported, setPasskeySupported] = useState<boolean>(false);

    useEffect(() => {
        isPasskeySupported().then(setPasskeySupported);
    }, []);

    useEffect(() => {
        let userDocUnsubscribe: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (userDocUnsubscribe) {
                userDocUnsubscribe();
                userDocUnsubscribe = null;
            }

            if (user) {
                const userDocRef = doc(db, 'users', user.uid);

                // Real-time listener on user profile document for instant vehicleType & status sync
                userDocUnsubscribe = onSnapshot(
                    userDocRef,
                    async (docSnap) => {
                        const localSecret = localStorage.getItem(`mobilis_wallet_secret_${user.uid}`) || '';
                        if (docSnap.exists()) {
                            const rawData = docSnap.data() as StellarData;
                            setStellarData({
                                ...rawData,
                                secret: rawData.secret || localSecret,
                            });
                        } else {
                            // Generate Stellar Keypair for new user
                            const pair = Keypair.random();
                            const publicKey = pair.publicKey();
                            const secret = pair.secret();

                            // Securely cache secret key locally on device only
                            localStorage.setItem(`mobilis_wallet_secret_${user.uid}`, secret);

                            const newStellarData: StellarData = {
                                uid: user.uid,
                                email: user.email || '',
                                publicKey,
                                role: 'driver',
                                status: 'approved',
                            } as StellarData;

                            try {
                                const friendbot = getFriendbotUrl();
                                if (friendbot) {
                                    fetch(`${friendbot}?addr=${publicKey}`).catch(() => { });
                                }
                                await setDoc(userDocRef, newStellarData);
                            } catch {
                                // Firestore write fallback
                            }

                            setStellarData({
                                ...newStellarData,
                                secret,
                            });
                        }
                        setLoading(false);
                    },
                    (err) => {
                        console.warn("User profile doc snapshot error:", err);
                        setLoading(false);
                    }
                );
            } else {
                setStellarData(null);
                setLoading(false);
            }
        });

        return () => {
            if (userDocUnsubscribe) userDocUnsubscribe();
            unsubscribe();
        };
    }, []);

    /**
     * Registers a new account and Smart Wallet with device Biometrics / Passkey.
     */
    const registerWithPasskey = async (
        email: string,
        displayName: string,
        role: 'commuter' | 'driver' | 'admin',
        extra?: Record<string, unknown>
    ): Promise<void> => {
        setLoading(true);
        try {
            // 1. Create WebAuthn Passkey and derive encrypted smart wallet
            const { keypair, record } = await registerPasskeySmartWallet(email, displayName, role);

            // 2. Ensure Firebase auth session exists (anonymous fallback or email)
            let user = auth.currentUser;
            if (!user) {
                const cred = await signInAnonymously(auth);
                user = cred.user;
            }

            const uid = user.uid;
            const newStellarData: StellarData = {
                uid,
                email: email || `${role}-passkey@mobilis.app`,
                fullName: displayName,
                publicKey: keypair.publicKey(),
                role,
                status: 'approved',
                isPasskeySecured: true,
                passkeyCredentialId: record.credentialId,
                ...extra,
            } as StellarData;

            // Save safe metadata to Firestore (no plaintext secret key!)
            await setDoc(doc(db, 'users', uid), newStellarData, { merge: true });
            
            // In-memory active session retains decrypted secret
            setStellarData({
                ...newStellarData,
                secret: keypair.secret(),
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Logs in with Passkey Biometric Auth (Face ID / Fingerprint / Windows Hello).
     */
    const loginWithPasskey = async (): Promise<void> => {
        setLoading(true);
        try {
            // 1. Biometric verification prompt & keypair decryption
            const { keypair, record } = await loginWithPasskeyVault();

            // 2. Ensure Firebase session
            let user = auth.currentUser;
            if (!user) {
                const cred = await signInAnonymously(auth);
                user = cred.user;
            }

            const uid = user.uid;
            const userDocRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);

            let activeData: StellarData;
            if (docSnap.exists()) {
                activeData = {
                    ...(docSnap.data() as StellarData),
                    secret: keypair.secret(),
                    publicKey: keypair.publicKey(),
                    isPasskeySecured: true,
                };
            } else {
                activeData = {
                    uid,
                    email: record.userEmail,
                    fullName: record.displayName,
                    publicKey: keypair.publicKey(),
                    role: record.role as 'driver' | 'commuter' | 'admin',
                    status: 'approved',
                    isPasskeySecured: true,
                    passkeyCredentialId: record.credentialId,
                };
                await setDoc(userDocRef, activeData);
                activeData.secret = keypair.secret();
            }

            setStellarData(activeData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                currentUser,
                stellarData,
                isPasskeySupported: passkeySupported,
                loginWithPasskey,
                registerWithPasskey,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
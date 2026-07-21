import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';
import type { AuthContextType, UserData as StellarData } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<AuthContextType['currentUser']>(null);
    const [stellarData, setStellarData] = useState<StellarData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

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
                        if (docSnap.exists()) {
                            setStellarData(docSnap.data() as StellarData);
                        } else {
                            // Generate Stellar Keypair for new user
                            const pair = Keypair.random();
                            const publicKey = pair.publicKey();
                            const secret = pair.secret();

                            const newStellarData: StellarData = {
                                uid: user.uid,
                                email: user.email || '',
                                publicKey,
                                secret,
                                role: 'driver',
                                status: 'approved',
                            } as StellarData;

                            try {
                                fetch(`https://friendbot.stellar.org?addr=${publicKey}`).catch(() => {});
                                await setDoc(userDocRef, newStellarData);
                            } catch {
                                // Firestore write fallback
                            }

                            setStellarData(newStellarData);
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

    return (
        <AuthContext.Provider value={{ currentUser, stellarData }}>
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
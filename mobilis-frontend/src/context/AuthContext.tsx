import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setStellarData(userDoc.data() as StellarData);
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
                } catch {
                    // Silently handle read timing before initial document creation
                    setStellarData(null);
                }
            } else {
                setStellarData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, stellarData }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
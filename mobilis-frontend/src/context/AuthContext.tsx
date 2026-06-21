import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Keypair } from '@stellar/stellar-sdk';
import type { AuthContextType, StellarData } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

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
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    setStellarData(userDoc.data() as StellarData);
                } else {
                    // Generate new wallet for the unbanked driver
                    const pair = Keypair.random();
                    const publicKey = pair.publicKey();
                    const secret = pair.secret();

                    try {
                        // Fund via Stellar Testnet Friendbot
                        await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);

                        const newStellarData: StellarData = { publicKey, secret, role: 'driver' };
                        await setDoc(userDocRef, newStellarData);
                        setStellarData(newStellarData);
                    } catch (error) {
                        console.error("Friendbot funding failed:", error);
                    }
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
import type { User as FirebaseUser } from 'firebase/auth';

export interface StellarData {
    publicKey: string;
    secret: string;
    role: 'driver' | 'admin';
}

export interface AuthContextType {
    currentUser: FirebaseUser | null;
    stellarData: StellarData | null;
}
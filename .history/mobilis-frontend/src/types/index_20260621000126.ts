import type { User as FirebaseUser } from 'firebase/auth';

// Define the exact shape of our Firestore database documents
export interface UserData {
    uid: string;
    email: string;
    role: 'driver' | 'admin' | 'superadmin';
    status: 'pending' | 'approved' | 'rejected';

    // Blockchain Data
    publicKey: string;
    secret: string; // NOTE: MVP only.

    // Specific Fields for Drivers
    fullName?: string;
    phone?: string;
    plateNumber?: string;
    todaAffiliation?: string; // Which TODA they belong to

    // Specific Fields for TODA Admins
    coopName?: string;
    contactPerson?: string;
    registrationNumber?: string;
}

export interface AuthContextType {
    currentUser: FirebaseUser | null;
    stellarData: UserData | null; // Renamed locally but keeps the same logic
}
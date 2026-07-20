import type { User as FirebaseUser } from 'firebase/auth';

// Define the exact shape of our Firestore database documents
export interface UserData {
    uid: string;
    email: string;
    role: 'driver' | 'admin' | 'superadmin' | 'commuter';
    status: 'pending' | 'approved' | 'rejected';

    // Blockchain Data
    publicKey: string;
    secret: string; // NOTE: MVP only.

    // Specific Fields for Drivers
    fullName?: string;
    phone?: string;
    plateNumber?: string;
    todaAffiliation?: string; // Which TODA they belong to
    isDuty?: boolean;
    lastLocation?: {
        lat: number;
        lng: number;
        updatedAt: string;
    };

    // Specific Fields for TODA Admins
    coopName?: string;
    contactPerson?: string;
    registrationNumber?: string;

    // FCM Push Notification Token
    fcmToken?: string;
}

export interface DriverLocationDoc {
    uid: string;
    publicKey: string;
    driverName: string;
    plateNumber: string;
    todaAffiliation: string;
    lat: number;
    lng: number;
    active: boolean;
    updatedAt: string | number;
}

export interface FareTransaction {
    id?: string;
    txHash: string;
    driverId: string;
    driverName: string;
    driverPublicKey: string;
    driverPlateNumber?: string;
    driverToda?: string;
    commuterId: string;
    commuterName: string;
    commuterPublicKey: string;
    amount: string;
    amountPhp?: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'failed';
    type: 'fare_payment';
}

export interface AuthContextType {
    currentUser: FirebaseUser | null;
    stellarData: UserData | null; // Renamed locally but keeps the same logic
}
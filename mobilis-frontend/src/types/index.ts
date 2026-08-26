import type { User as FirebaseUser } from 'firebase/auth';

// Define the exact shape of our Firestore database documents
export interface UserData {
    uid: string;
    email: string;
    role: 'driver' | 'admin' | 'superadmin' | 'commuter';
    status: 'pending' | 'approved' | 'rejected';

    // Blockchain Data
    publicKey: string;
    secret: string; // Non-custodial or Passkey Enclave unlocked

    // Passkey / WebAuthn Account Abstraction
    isPasskeySecured?: boolean;
    passkeyCredentialId?: string;

    // Specific Fields for Drivers
    fullName?: string;
    phone?: string;
    plateNumber?: string;
    todaAffiliation?: string; // Which TODA they belong to
    vehicleType?: 'Jeepney' | 'E-Jeepney' | 'Tricycle' | 'E-Trike' | 'UV Express' | 'Bus' | 'E-Vehicle' | 'Motorcycle';
    pendingVehicleType?: 'Jeepney' | 'E-Jeepney' | 'Tricycle' | 'E-Trike' | 'UV Express' | 'Bus' | 'E-Vehicle' | 'Motorcycle';
    vehicleChangeStatus?: 'pending' | 'approved' | 'rejected';
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
    vehicleType?: 'Jeepney' | 'E-Jeepney' | 'Tricycle' | 'E-Trike' | 'UV Express' | 'Bus' | 'E-Vehicle' | 'Motorcycle';
    lat: number;
    lng: number;
    speed?: number;
    active: boolean;
    updatedAt: string | number;
}

export interface WaitingBeaconDoc {
    id: string;
    commuterUid: string;
    lat: number;
    lng: number;
    active: boolean;
    preferredVehicleType?: string;
    createdAt: string;
    expiresAt: string;
}

export interface PickupSessionDoc {
    id: string;
    driverUid: string;
    commuterUid: string;
    driverName?: string;
    plateNumber?: string;
    status: 'accepted' | 'approaching' | 'arrived' | 'completed' | 'cancelled';
    vehicleType: string;
    driverLat: number;
    driverLng: number;
    commuterLat: number;
    commuterLng: number;
    acceptedAt: string;
    updatedAt: string;
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
    stellarData: UserData | null;
    isPasskeySupported: boolean;
    loginWithPasskey: () => Promise<void>;
    registerWithPasskey: (
        email: string,
        displayName: string,
        role: 'commuter' | 'driver' | 'admin',
        extra?: Record<string, unknown>
    ) => Promise<void>;
}
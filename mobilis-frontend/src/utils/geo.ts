/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
export function calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 1000) / 1000;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

function rad2deg(rad: number): number {
    return rad * (180 / Math.PI);
}

/**
 * Formats distance into human readable string (meters if < 1km, else km)
 */
export function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
        const meters = Math.round(distanceKm * 1000);
        return `${meters}m away`;
    }
    return `${distanceKm.toFixed(1)}km away`;
}

/**
 * Calculates initial bearing / heading angle in degrees (0 - 360) and cardinal direction.
 */
export function calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): { angle: number; cardinal: string } {
    const φ1 = deg2rad(lat1);
    const φ2 = deg2rad(lat2);
    const Δλ = deg2rad(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const angle = (rad2deg(θ) + 360) % 360;

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    return { angle: Math.round(angle), cardinal: directions[index] };
}

/**
 * Calculates Estimated Time of Arrival (ETA) based on average transit speed (default 20 km/h for city traffic).
 */
export function calculateETA(distanceKm: number, averageSpeedKmh: number = 20): string {
    const timeHours = distanceKm / averageSpeedKmh;
    const timeMinutes = Math.ceil(timeHours * 60);
    if (timeMinutes <= 1) return 'Arriving in 1 min';
    return `Arriving in ${timeMinutes} min`;
}

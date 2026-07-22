import maplibregl from 'maplibre-gl';

/**
 * Dynamically applies role-based color tinting (roads, buildings, water, background)
 * to a MapLibre GL JS map instance, with full support for Light & Dark modes.
 */
export function applyRoleMapStyle(map: maplibregl.Map, role: string, isDark: boolean) {
    if (!map) return;

    const doApply = () => {
        try {
            const style = map.getStyle();
            if (!style || !style.layers) return;

            const roleKey = (role || 'commuter').toLowerCase();

            const palette = roleKey === 'driver'
                ? (isDark
                    ? { road: '#06b6d4', building: '#092536', buildingOutline: '#0891b2', water: '#061a26', bg: '#041018' }
                    : { road: '#0891b2', building: '#cffaff', buildingOutline: '#06b6d4', water: '#a5f3fc', bg: '#ecfeff' })
                : roleKey === 'superadmin'
                ? (isDark
                    ? { road: '#f43f5e', building: '#330f1c', buildingOutline: '#e11d48', water: '#240813', bg: '#18050c' }
                    : { road: '#e11d48', building: '#ffe4e6', buildingOutline: '#f43f5e', water: '#fecdd3', bg: '#fff1f2' })
                : roleKey === 'admin' || roleKey === 'cooperative'
                ? (isDark
                    ? { road: '#6366f1', building: '#161b42', buildingOutline: '#4f46e5', water: '#0f1230', bg: '#0a0c20' }
                    : { road: '#4f46e5', building: '#e0e7ff', buildingOutline: '#6366f1', water: '#c7d2fe', bg: '#eef2ff' })
                : (isDark // commuter
                    ? { road: '#10b981', building: '#082e20', buildingOutline: '#059669', water: '#041f16', bg: '#03140e' }
                    : { road: '#059669', building: '#d1fae5', buildingOutline: '#10b981', water: '#a7f3d0', bg: '#ecfdf5' });

            style.layers.forEach((layer) => {
                const id = layer.id.toLowerCase();
                try {
                    // Background
                    if (layer.type === 'background') {
                        map.setPaintProperty(layer.id, 'background-color', palette.bg);
                    }
                    // Road & Transit Lines
                    else if (layer.type === 'line' && (id.includes('road') || id.includes('highway') || id.includes('transport') || id.includes('street') || id.includes('link') || id.includes('path') || id.includes('line'))) {
                        map.setPaintProperty(layer.id, 'line-color', palette.road);
                    }
                    // Buildings ("houses" & structures)
                    else if (layer.type === 'fill' && (id.includes('building') || id.includes('house') || id.includes('structure'))) {
                        map.setPaintProperty(layer.id, 'fill-color', palette.building);
                        try {
                            map.setPaintProperty(layer.id, 'fill-outline-color', palette.buildingOutline);
                        } catch {
                            // Safe catch if fill-outline-color is unsupported
                        }
                    }
                    // Water Fills
                    else if (layer.type === 'fill' && id.includes('water')) {
                        map.setPaintProperty(layer.id, 'fill-color', palette.water);
                    }
                    // Land & Parks
                    else if (layer.type === 'fill' && (id.includes('land') || id.includes('park'))) {
                        map.setPaintProperty(layer.id, 'fill-color', palette.bg);
                    }
                } catch {
                    // Ignore individual paint property errors on incompatible layers
                }
            });
        } catch (e) {
            console.warn("Error applying role map style:", e);
        }
    };

    if (map.isStyleLoaded()) {
        doApply();
    } else {
        map.once('styledata', doApply);
    }
}

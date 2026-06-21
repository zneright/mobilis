import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
    return (
        <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>Mobilis</h1>
            <p style={{ fontSize: '1.2rem', color: '#52525b', marginBottom: '40px' }}>
                Instant, zero-interest fuel advances for TODA drivers on the Stellar network.
            </p>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <Link to="/login" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '15px 30px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Log In
                    </button>
                </Link>
                <Link to="/signup" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '15px 30px', backgroundColor: '#fff', color: '#000', border: '2px solid #000', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Create Account
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Landing;
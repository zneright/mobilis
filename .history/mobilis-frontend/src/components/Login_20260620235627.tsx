import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // We don't need to ask for their role here because Firebase 
            // already knows who they are and AuthContext will fetch their specific data!
            navigate('/dashboard');
        } catch (err) {
            setError("Failed to sign in. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif' }}>
            <h2>Welcome Back</h2>
            <p>Sign in to access the Mobilis network.</p>

            {error && <div style={{ color: '#ef4444', marginBottom: '15px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>{error}</div>}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} />
                <button type="submit" disabled={isLoading} style={{ padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                    {isLoading ? 'Signing In...' : 'Log In'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Need an account? <Link to="/signup" style={{ color: '#000', fontWeight: 'bold' }}>Sign Up</Link>
            </p>
        </div>
    );
};

export default Login;
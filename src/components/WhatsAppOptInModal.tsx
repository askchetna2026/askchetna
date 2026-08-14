'use client';

import { useState } from 'react';
import { X, MessageSquare, Phone } from 'lucide-react';

interface WhatsAppOptInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentPhone?: string | null;
}

export default function WhatsAppOptInModal({ isOpen, onClose, onSuccess, currentPhone }: WhatsAppOptInModalProps) {
    const [phone, setPhone] = useState(currentPhone || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) {
            setError('Please enter a valid phone number with country code (e.g. +1).');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Update phone number
            const phoneRes = await fetch('/api/user/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });

            if (!phoneRes.ok) {
                throw new Error('Failed to save phone number');
            }

            // Opt-in to WhatsApp
            const optInRes = await fetch('/api/user/whatsapp-optin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ optIn: true }),
            });

            if (!optInRes.ok) {
                throw new Error('Failed to enable WhatsApp alerts');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
        }}>
            <div style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--accent-gold)',
                borderRadius: '16px',
                padding: '32px',
                width: '100%',
                maxWidth: '400px',
                position: 'relative',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'transparent', border: 'none',
                        color: 'var(--text-muted)', cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ 
                        background: 'linear-gradient(to bottom right, #25D366, #128C7E)', 
                        width: '64px', height: '64px', borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        margin: '0 auto 16px', color: 'white'
                    }}>
                        <MessageSquare size={32} />
                    </div>
                    <h2 className="mystic-text text-2xl text-[var(--accent-gold)] mb-2">Connect WhatsApp</h2>
                    <p style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '14px', lineHeight: 1.5 }}>
                        Enable WhatsApp to chat directly with your AI astrologer and receive your daily horoscope!
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Your Phone Number
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="tel"
                                placeholder="+1 234 567 8900"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--card-border)',
                                    background: 'var(--background)',
                                    color: 'var(--foreground)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Include your country code (e.g., +1 for US, +91 for India)</p>
                    </div>

                    {error && (
                        <p style={{ color: '#ff4d4f', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(to right, #25D366, #128C7E)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '16px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {isSubmitting ? 'Connecting...' : 'Enable WhatsApp'}
                    </button>
                </form>
            </div>
        </div>
    );
}

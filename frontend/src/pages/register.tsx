import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/layout/Layout';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail] = useState('');
  const { register, isLoading, error } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email);
      toast.success('注册成功！');
      router.push('/');
    } catch (err) {
      // 错误已经在store中处理
    }
  };

  return (
    <Layout>
      <div style={{
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          maxWidth: '28rem',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{textAlign: 'center'}}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '9999px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <svg style={{width: '1.5rem', height: '1.5rem', color: '#4f46e5'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <h2 style={{
              marginTop: '1.5rem',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827'
            }}>
              创建新账户
            </h2>
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              已有账户？{' '}
              <Link href="/login" style={{
                color: '#4f46e5',
                fontWeight: '500',
                textDecoration: 'none'
              }}>
                立即登录
              </Link>
            </p>
          </div>

          <div style={{
            marginTop: '2rem',
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}
                >
                  邮箱地址
                </label>
                <div style={{position: 'relative'}}>
                  <div style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}>
                    <svg style={{width: '1.25rem', height: '1.25rem', color: '#9ca3af'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '0.75rem',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  color: '#b91c1c',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#818cf8' : '#4f46e5',
                  color: 'white',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin" style={{width: '1rem', height: '1rem'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>注册中...</span>
                  </>
                ) : (
                  <span>注册</span>
                )}
              </button>
            </form>

            <div style={{marginTop: '1.5rem'}}>
              <div style={{position: 'relative', textAlign: 'center'}}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  borderTop: '1px solid #e5e7eb'
                }}></div>
                <span style={{
                  position: 'relative',
                  backgroundColor: 'white',
                  padding: '0 0.75rem',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  注册说明
                </span>
              </div>

              <div style={{
                marginTop: '1.5rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <p style={{display: 'flex', gap: '0.5rem'}}>
                  <span>1.</span>
                  <span>输入您的邮箱地址</span>
                </p>
                <p style={{display: 'flex', gap: '0.5rem'}}>
                  <span>2.</span>
                  <span>系统会要求您创建一个Passkey（生物识别或PIN码）</span>
                </p>
                <p style={{display: 'flex', gap: '0.5rem'}}>
                  <span>3.</span>
                  <span>创建成功后，您可以使用Passkey登录您的账户</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 
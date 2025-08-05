// Modern Login Page JavaScript
class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupAnimations();
    }

    bindEvents() {
        // Password toggle
        const passwordToggle = document.getElementById('passwordToggle');
        const passwordInput = document.getElementById('password');
        
        passwordToggle?.addEventListener('click', () => {
            this.togglePassword(passwordInput, passwordToggle);
        });

        // Form submission
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        // Social login buttons
        document.getElementById('googleBtn')?.addEventListener('click', () => {
            this.handleSocialLogin('google');
        });

        document.getElementById('githubBtn')?.addEventListener('click', () => {
            this.handleSocialLogin('github');
        });

        // Input animations
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => this.handleInputFocus(e));
            input.addEventListener('blur', (e) => this.handleInputBlur(e));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.handleLogin(e);
            }
        });
    }

    togglePassword(input, toggle) {
        const icon = toggle.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }

        // Add ripple effect
        this.addRippleEffect(toggle);
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        const submitBtn = document.querySelector('.login-btn');

        // Validation
        if (!this.validateEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Show loading state
        this.setLoading(submitBtn, true);

        try {
            // Simulate API call
            await this.simulateLogin(email, password, remember);
            
            this.showToast('Login successful! Redirecting...', 'success');
            
            // Simulate redirect after success
            setTimeout(() => {
                console.log('Redirecting to dashboard...');
                // window.location.href = '/dashboard';
            }, 1500);

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async simulateLogin(email, password, remember) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate login logic
        if (email === 'demo@example.com' && password === 'password') {
            if (remember) {
                localStorage.setItem('rememberUser', 'true');
            }
            return { success: true, token: 'fake-jwt-token' };
        } else {
            throw new Error('Invalid email or password');
        }
    }

    handleSocialLogin(provider) {
        this.showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login clicked`, 'success');
        
        // Add click animation
        const button = document.getElementById(`${provider}Btn`);
        this.addClickAnimation(button);
        
        // Simulate social login
        console.log(`Initiating ${provider} login...`);
        // In real implementation, redirect to OAuth provider
    }

    handleInputFocus(e) {
        const wrapper = e.target.closest('.input-wrapper');
        wrapper?.classList.add('focused');
        
        // Add glow effect
        e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
    }

    handleInputBlur(e) {
        const wrapper = e.target.closest('.input-wrapper');
        wrapper?.classList.remove('focused');
        
        // Remove glow effect
        e.target.style.boxShadow = '';
    }

    setLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = toast.querySelector('.toast-message');
        
        // Set message and type
        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    addRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            pointer-events: none;
            transform: scale(0);
            animation: ripple 0.6s linear;
            left: 50%;
            top: 50%;
            width: 20px;
            height: 20px;
            margin-left: -10px;
            margin-top: -10px;
        `;
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    addClickAnimation(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    setupAnimations() {
        // Add stagger animation to form elements
        const formElements = document.querySelectorAll('.form-group, .form-options, .login-btn, .social-buttons');
        formElements.forEach((element, index) => {
            element.style.animationDelay = `${index * 0.1}s`;
            element.classList.add('fade-in-up');
        });

        // Parallax effect for background shapes
        if (window.innerWidth > 768) {
            document.addEventListener('mousemove', (e) => {
                const shapes = document.querySelectorAll('.shape');
                const x = e.clientX / window.innerWidth;
                const y = e.clientY / window.innerHeight;
                
                shapes.forEach((shape, index) => {
                    const speed = (index + 1) * 0.5;
                    const xOffset = (x - 0.5) * speed * 20;
                    const yOffset = (y - 0.5) * speed * 20;
                    
                    shape.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
                });
            });
        }

        // Auto-focus first input
        setTimeout(() => {
            document.getElementById('email')?.focus();
        }, 500);
    }
}

// Enhanced CSS animations via JavaScript
const styles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .fade-in-up {
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
        transform: translateY(20px);
    }
    
    .input-wrapper.focused .input-icon {
        color: hsl(263, 70%, 50%);
        transform: translateY(-50%) scale(1.1);
    }
    
    .form-input:focus + .password-toggle {
        color: hsl(263, 70%, 50%);
    }
`;

// Add enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Demo credentials helper
const addDemoHelper = () => {
    const demoHelper = document.createElement('div');
    demoHelper.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        ">
            <strong>Demo Credentials:</strong><br>
            Email: demo@example.com<br>
            Password: password
        </div>
    `;
    document.body.appendChild(demoHelper);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        demoHelper.style.opacity = '0';
        demoHelper.style.transform = 'translateY(100%)';
        setTimeout(() => demoHelper.remove(), 300);
    }, 10000);
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
    addDemoHelper();
    
    console.log('🚀 Modern Login Page Loaded Successfully!');
    console.log('📧 Demo: demo@example.com | 🔑 Password: password');
});
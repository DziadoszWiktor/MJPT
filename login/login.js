document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

const observer = new MutationObserver(() => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    }
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// Get elements
const usernameInput   = document.getElementById('username');
const passwordInput   = document.getElementById('password');
const loginForm       = document.getElementById('loginForm');
const submitButton    = document.getElementById('submitButton');
const forgotPassword  = document.getElementById('forgotPassword');

const imageSide       = document.getElementById('imageSide');
const sideImage       = document.getElementById('sideImage');
const overlay         = document.getElementById('overlay');
const particles       = document.getElementById('particles');
const imageText       = document.getElementById('imageText');
const imageTitle      = document.getElementById('imageTitle');
const imageSubtitle   = document.getElementById('imageSubtitle');
const energyWaves     = document.getElementById('energyWaves');
const formTitle       = document.getElementById('formTitle');
const usernameLabel   = document.getElementById('usernameLabel');
const passwordLabel   = document.getElementById('passwordLabel');
const formError       = document.getElementById('formError');

let isSubmitting = false;

/* ---------- ENERGY WAVES STATE ---------- */
function setWavesState(state) {
    if (!energyWaves) return;

    energyWaves.classList.remove('success', 'error');

    if (state === 'success') {
        energyWaves.classList.add('visible', 'success');
        return;
    }

    if (state === 'error') {
        energyWaves.classList.add('visible', 'error');
        return;
    }

    energyWaves.classList.remove('visible');
}

/* ---------- ERROR UX ---------- */
function clearError() {
    if (formError) {
        formError.textContent = '';
        formError.classList.remove('visible');
    }
    usernameInput.classList.remove('error');
    passwordInput.classList.remove('error');
    loginForm.classList.remove('shake');

    setWavesState(null);
}

function showError(message) {
    if (formError) {
        formError.textContent = message;
        formError.classList.add('visible');
    }
    usernameInput.classList.add('error');
    passwordInput.classList.add('error');

    setWavesState('error');

    loginForm.classList.remove('shake');

    void loginForm.offsetWidth;
    loginForm.classList.add('shake');
}

usernameInput.addEventListener('input', clearError);
passwordInput.addEventListener('input', clearError);

/* ---------- PARALLAX (desktop only feels best) ---------- */
if (imageSide) {
    imageSide.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(max-width: 768px)').matches) return;

        const rect = imageSide.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / rect.width - 0.5;
        const relY = (e.clientY - rect.top) / rect.height - 0.5;

        const moveX = relX * 18;
        const moveY = relY * 12;

        imageText.style.transform = `translate3d(${moveX * 0.8}px, ${moveY * 0.8}px, 0)`;
        particles.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
        overlay.style.transform   = `translate3d(${moveX * 0.4}px, ${moveY * 0.4}px, 0)`;
    });

    imageSide.addEventListener('mouseleave', () => {
        imageText.style.transform = '';
        particles.style.transform = '';
        overlay.style.transform   = '';
    });
}

usernameInput.addEventListener('focus', () => {
    clearError();

    sideImage.classList.add('focus-login');
    sideImage.classList.remove('focus-password', 'submitting');

    overlay.classList.add('focus-login');
    overlay.classList.remove('focus-password', 'submitting');

    particles.classList.add('visible');

    imageText.classList.add('focused');
    imageTitle.classList.add('focus-login');
    imageTitle.classList.remove('focus-password', 'submitting');
    imageSubtitle.textContent = '💪 Inserisci il tuo username';

    formTitle.classList.add('focused');
    usernameLabel.classList.add('focused');

    forgotPassword.classList.add('dimmed');
});

usernameInput.addEventListener('blur', () => {
    if (!passwordInput.matches(':focus') && !isSubmitting) {
        resetAnimations();
    }
});

passwordInput.addEventListener('focus', () => {
    clearError();

    sideImage.classList.add('focus-password');
    sideImage.classList.remove('focus-login', 'submitting');

    overlay.classList.add('focus-password');
    overlay.classList.remove('focus-login', 'submitting');

    particles.classList.add('visible');

    imageText.classList.add('focused');
    imageTitle.classList.add('focus-password');
    imageTitle.classList.remove('focus-login', 'submitting');
    imageSubtitle.textContent = '🔒 Proteggi il tuo account';

    formTitle.classList.add('focused');
    passwordLabel.classList.add('focused');

    forgotPassword.classList.add('dimmed');
});

passwordInput.addEventListener('blur', () => {
    if (!usernameInput.matches(':focus') && !isSubmitting) {
        resetAnimations();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearError();

    if (isSubmitting) return;
    isSubmitting = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    sideImage.classList.add('submitting');
    sideImage.classList.remove('focus-login', 'focus-password');

    overlay.classList.add('submitting');
    overlay.classList.remove('focus-login', 'focus-password');

    particles.classList.remove('visible');

    setWavesState(null);
    energyWaves.classList.add('visible');

    imageTitle.classList.add('submitting');
    imageTitle.classList.remove('focus-login', 'focus-password');
    imageSubtitle.textContent = '🚀 Accesso in corso...';

    submitButton.classList.add('submitting');
    submitButton.textContent = 'Accesso in corso...';
    submitButton.disabled = true;

    try {
        const res = await fetch('/login/login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.status === 'ok') {
            setWavesState('success');
            window.location.href = '/index.php';
            return;
        }

        // INVALID LOGIN
        imageSubtitle.textContent = '❌ Credenziali non valide';
        imageSide.classList.add('has-error');
        imageTitle.classList.remove('submitting');
        imageTitle.classList.add('focus-password');

        showError('Credenziali non valide. Controlla username e password.');
    } catch (err) {
        console.error(err);
        imageSubtitle.textContent = '⚠️ Errore di connessione, riprova';
        showError('Errore di connessione. Riprova tra qualche secondo.');
    } finally {
        isSubmitting = false;
        submitButton.classList.remove('submitting');
        submitButton.textContent = 'Accedi';
        submitButton.disabled = false;

        if (!energyWaves.classList.contains('error') && !energyWaves.classList.contains('success')) {
            energyWaves.classList.remove('visible');
        }

        sideImage.classList.remove('submitting');
        overlay.classList.remove('submitting');
        imageTitle.classList.remove('submitting');
    }
});

function resetAnimations() {
    sideImage.classList.remove('focus-login', 'focus-password', 'submitting');
    overlay.classList.remove('focus-login', 'focus-password', 'submitting');

    particles.classList.remove('visible');
    setWavesState(null);

    imageText.style.transform = '';
    particles.style.transform = '';
    overlay.style.transform   = '';

    imageText.classList.remove('focused');
    imageTitle.classList.remove('focus-login', 'focus-password', 'submitting');
    imageSubtitle.textContent = 'Gestisci i tuoi clienti con facilità';

    formTitle.classList.remove('focused');

    usernameLabel.classList.remove('focused');
    passwordLabel.classList.remove('focused');

    forgotPassword.classList.remove('dimmed');
}

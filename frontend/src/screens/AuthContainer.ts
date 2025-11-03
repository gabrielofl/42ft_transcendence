import { navigateTo } from "../navigation.js";
import { apiService, LoginRequest, RegisterRequest } from "../services/api.js";

declare global {
interface Window {
	google: any;
	handleCredentialResponse: (response: any) => void;
}
}

type AuthMsg = "error" | "success" | "warning" | "info";
type AuthMsgScope =
  | "global"
  | "login"
  | "register"
  | "twofa"
  | "google"
  | "forgot";

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function messageClasses(variant: AuthMsg) {
  switch (variant) {
    case "success":
      return "bg-emerald-900/30 border-emerald-500 text-emerald-200";
    case "warning":
      return "bg-amber-900/30 border-amber-500 text-amber-100";
    case "info":
      return "bg-indigo-900/30 border-indigo-400 text-indigo-100";
    default:
      return "bg-rose-900/30 border-rose-500 text-rose-100";
  }
}

function showAuthMessage(
  text: string,
  variant: AuthMsg = "error",
  scope: AuthMsgScope = "global"
) {
  const map: Record<AuthMsgScope, string> = {
    global: "auth-message",
    login: "login-result",
    register: "register-result",
    twofa: "twofa-result",
    google: "auth-message",
    forgot: "forgot-result",
  };
  const id = map[scope];
  const node = el(id);
  if (!node) return;

  node.classList.remove("hidden");
  node.className = `rounded-lg border px-3 py-2 text-xs ${messageClasses(
    variant
  )}`;
  node.innerHTML = `<div class="flex items-start gap-2">
    <span class="material-symbols-outlined text-base leading-4 mt-[2px]">info</span>
    <p class="leading-4">${text}</p>
  </div>`;

  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAuthMessages() {
  [
    "auth-message",
    "login-result",
    "register-result",
    "twofa-result",
    "forgot-result",
  ].forEach((id) => {
    const n = el(id);
    if (n) {
      n.classList.add("hidden");
      n.innerHTML = "";
    }
  });
}

function normalizeBackendError(
  res: any
): { message: string; variant?: AuthMsg; fields?: Record<string, string> } {
  if (res?.code === "FST_ERR_VALIDATION" || Array.isArray(res?.validation)) {
    const fields: Record<string, string> = {};
    const lines: string[] = [];
    (res.validation || []).forEach((v: any) => {
      const path = (v.instancePath || "").replace(/^\//, "");
      const field = path || v.params?.missingProperty || "field";
      const msg =
        v.message?.replace("must ", "").replace("string", "value") ||
        "is invalid";
      const pretty =
        field === "email" || field === "emailAddress"
          ? "Email"
          : field === "username"
          ? "Username"
          : field === "password"
          ? "Password"
          : field === "firstName"
          ? "First name"
          : field === "lastName"
          ? "Last name"
          : field;
      const out = `${pretty}: ${msg}`;
      lines.push(out);
      fields[field] = msg;
    });

    const topMsg = res.message as string | undefined;
    if (topMsg && lines.length === 0) {
      const m = topMsg.match(/body\/(.+?)\s+(.+)/i);
      if (m) {
        const f = m[1];
        const msg = m[2].replace("must ", "");
        lines.push(`${f}: ${msg}`);
        fields[f] = msg;
      } else {
        lines.push(topMsg);
      }
    }

    return {
      message:
        lines.join("<br/>") ||
        "Some fields are invalid. Please review the form and try again.",
      variant: "warning",
      fields,
    };
  }

  switch (res?.status || res?.statusCode) {
    case 400:
      return {
        message:
          res?.error || res?.message || "Bad request. Please check your input.",
        variant: "warning",
      };
    case 401:
      return {
        message: res?.error || "Unauthorized. Please check your credentials.",
      };
    case 404:
      return { message: res?.error || "Resource not found." };
    case 409:
      return {
        message:
          res?.error ||
          "That username or email is already in use. Please try a different one.",
      };
    case 500:
      return {
        message:
          res?.error || "Internal server error. Please try again in a moment.",
      };
  }

  if (typeof res?.error === "string") {
    return { message: res.error };
  }

  return {
    message: "Something went wrong. Please try again.",
  };
}

window.handleCredentialResponse = async (response: any) => {
	try {
		if (!response.credential)
			return;
		const result = await apiService.googleLogin(response.credential);
		if (result.status === 202 && result.requires2FA) {
		pendingLoginChallenge = result.challenge || null;
		showAuthMessage(
			"Two-factor authentication required. Please enter your code.",
			"info",
			"global"
		);
		show2FA(false);
		return;
		}

		if (result.success) {
		hideAuthMessages();
		navigateTo('home');
		return;
		}

    const { message, variant } = normalizeBackendError(result);
    showAuthMessage(message, variant || "error", "google");
  } catch (error) {
    console.error("Google authentication error:", error);
    showAuthMessage(
      "Google authentication failed. Please try again.",
      "error",
      "google"
    );
  }
};

let isLogin = true;
let pendingLoginChallenge: string | null = null;

export function renderAuthContainer(): void {
const main = document.getElementById('main');
if (!main) return;

  const remembered = JSON.parse(localStorage.getItem("rememberMe") || "false");
  const rememberedEmail = localStorage.getItem("rememberEmail") || "";

	main.innerHTML = `
<div id="auth-form-container">
	<div class="flex items-center justify-center p-4">
	<div class="max-w-md w-full space-y-8">
		<div class="bg-[#25004d] border border-[#ff00ff] rounded-2xl shadow-xl p-8">
		<div class="text-center mb-8">
			<h2 class="text-2xl font-bold text-[#ff00ff] mb-2">
			${isLogin ? 'Welcome Back' : 'Create Account'}
			</h2>
			<p class="text-[#ffff66] text-sm">
			${isLogin ? 'Sign in to your account to continue' : 'Join us today and get started'}
			</p>
		</div>
        
		<!-- Global Message -->
        <div id="auth-message" class="hidden"></div>

		<div class="flex rounded-lg gap-4 p-1 mb-6">
			<button id="sign-in-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			isLogin ? 'text-white shadow-sm btn-four' : ' hover:text-gray-700 btn-five font-normal'
			}">SIGN IN</button>
			<button id="sign-up-tab" class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
			!isLogin ? 'text-white shadow-sm btn-four' : 'hover:text-gray-700 btn-five font-normal'
			}">SIGN UP</button>
		</div>

		<div class="p-1 mb-6">
			<!-- Google Sign-In Button -->
			<button id="google-login-btn" class="btn-primary w-full rounded-lg text-xs">
			${isLogin ? 'SIGN IN WITH GOOGLE' : 'SIGN UP WITH GOOGLE'}
			</button>
		</div>
			<!-- Divider -->
		<div class="relative">
			<div class="relative my-8">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-[--secondary-color]"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="bg-[#25004d] text-xs px-3 text-[--secondary-color]">Or continue with email</span>
				</div>
				</div>
		</div>
		<div id="auth-form-wrapper">
			${isLogin ? renderLoginForm(remembered, rememberedEmail) : renderRegisterForm()}
		</div>
		</div>
		</div>
	</div>
	</div>

<!-- 2FA Modal -->
<div id="twofa-container" class="hidden fixed inset-0 flex items-center justify-center bg-black/60 z-50">
  <div class="w-full max-w-sm p-6 border border-[--primary-color] bg-[#1a0033] rounded-lg shadow-md">
    <div id="twofa-result" class="hidden mb-3"></div>
    <div class="text-center text-[#ff00ff] mb-4" id="twofa-mode-register">
      Scan this QR code with your authenticator app:
    </div>
    <div class="text-center text-[#ff00ff] mb-4 hidden" id="twofa-mode-login">
      Enter your 2FA code from your app:
    </div>
    <div class="text-center text-[#ff00ff] mb-4 hidden" id="backup-mode-login">
      Enter one of your backup codes:
    </div>
    <div id="qrcode-wrapper" class="flex justify-center mb-4">
      <img id="qrcode-img" src="" class="h-24 w-24 border border-white rounded-md" />
    </div>
    <input
      id="twofa-code"
      type="text"
      placeholder="Enter 6-digit code"
      class="block w-full px-4 py-3 border border-[--secondary-color] rounded-lg text-sm bg-[--bg-color] text-white placeholder-white mb-3"
    />
    <input
      id="backup-code"
      type="text"
      placeholder="Enter 8-character backup code"
      class="block w-full px-4 py-3 border border-[--secondary-color] rounded-lg text-sm bg-[--bg-color] text-white placeholder-white mb-3 hidden"
    />
    <button id="submit-twofa-btn" class="w-full btn-primary text-white py-2 rounded-lg">Enable / Verify 2FA</button>
    <button id="toggle-backup-btn" class="mt-2 w-full text-sm text-[--secondary-color] hover:text-[#ff00ff] hidden">Use backup code instead</button>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button id="skip-twofa-btn" class="hidden text-xs text-[--secondary-color] hover:text-[#ff00ff] border border-[--secondary-color] rounded-md py-2">Skip for now</button>
      <button id="back-to-auth" class="text-xs text-[--secondary-color] hover:text-[#ff00ff] border border-[--secondary-color] rounded-md py-2">Back</button>
    </div>
  </div>
</div>

<!-- Forgot Password Modal -->
<div id="forgot-modal" class="hidden fixed inset-0 flex items-center justify-center bg-black/60 z-50">
  <div class="w-full max-w-md p-6 border border-[--primary-color] bg-[#1a0033] rounded-lg shadow-md">
    <div id="forgot-result" class="hidden mb-3"></div>

    <div id="forgot-step-1">
      <h3 class="text-[#ff00ff] text-lg mb-2">Reset your password</h3>
      <p class="text-[--secondary-color] text-xs mb-4">Enter your account email. We’ll send a one-time code (OTP) to reset your password.</p>
      <div class="relative mb-4">
        <span class="material-symbols-outlined absolute left-3 top-2.5 text-white">mail</span>
        <input id="forgot-email" type="email" class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg placeholder-white" placeholder="you@example.com" />
      </div>
      <button id="forgot-send-btn" class="w-full btn-primary py-2 rounded-lg">Send OTP</button>
      <button id="forgot-cancel-btn" class="w-full mt-2 text-xs text-[--secondary-color] hover:text-[#ff00ff]">Cancel</button>
    </div>

    <div id="forgot-step-2" class="hidden">
      <h3 class="text-[#ff00ff] text-lg mb-2">Enter code & new password</h3>
      <p class="text-[--secondary-color] text-xs mb-3">Use the 6-digit OTP from email or switch to a backup code if you have 2FA enabled.</p>

      <div class="mb-2 flex items-center justify-between">
        <span class="text-[--secondary-color] text-xs">Code mode:</span>
        <button id="forgot-toggle-mode" class="text-xs text-[--secondary-color] hover:text-[#ff00ff]">Use backup code instead</button>
      </div>

      <div class="grid gap-3">
        <input id="forgot-otp" type="text" maxlength="6" class="block w-full px-4 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg placeholder-white" placeholder="6-digit OTP" />
        <input id="forgot-backup" type="text" maxlength="8" class="hidden block w-full px-4 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg placeholder-white" placeholder="8-character backup code" />

        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
          <input id="forgot-newpass" type="password" class="block w-full pl-10 pr-12 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg placeholder-white" placeholder="New password (min 8 chars)" />
          <button type="button" id="toggle-forgot-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-white">
            <span class="material-symbols-outlined text-xl">visibility</span>
          </button>
        </div>
      </div>
      <button id="forgot-reset-btn" class="w-full mt-4 btn-primary py-2 rounded-lg">Reset Password</button>
      <button id="forgot-back-btn" class="w-full mt-2 text-xs text-[--secondary-color] hover:text-[#ff00ff]">← Back</button>
    </div>
  </div>
</div>
`;

  hideAuthMessages();
  setupAuthEvents();
  initializeGoogleSignIn();

  if (isLogin) {
    const email = el<HTMLInputElement>("email");
    if (email) email.focus();
  } else {
    const first = el<HTMLInputElement>("firstname");
    if (first) first.focus();
  }
}

function renderLoginForm(remembered: boolean, rememberedEmail: string): string {
return `
	<div id="login-result" class="hidden"></div>

	<div id="login-form" class="space-y-4">
	<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-[#ff00ff] my-2">
			Email
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">mail</span>
			<input
				id="email"
				name="email"
				type="text"
				value="${remembered ? escapeHtml(rememberedEmail) : ""}"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your email"
			/>
			</div>
		</div>

		<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-[#ff00ff] my-2">Password</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-12 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your password"
			/>
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-gray-300 focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
		</div>

		<!-- Remember Me & Forgot Password -->
		<div class="flex w-full items-center justify-between py-2">
			<label class="flex items-center gap-2 cursor-pointer">
			<input
				id="remember-me"
				name="remember-me"
				type="checkbox"
				${remembered ? "checked" : ""}
				class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
			/>
			<span class="block text-xs text-[#ff00ff]">Remember me</span>
			</label>
			<button id="forgot-password-btn" type="button" class="text-xs text-[--secondary-color] hover:text-indigo-500 font-medium">Forgot password?</button>
			</div>
		<div>
			<button id="submit-login-btn" class="w-full bg-indigo-600 text-white text-sm font-medium p-3 rounded-lg hover:bg-indigo-700 transition btn-primary">
			SIGN IN
			</button>
		</div>
		</div>
`;
}

function renderRegisterForm(): string {
	return `
	<div id="register-result" class="hidden"></div>

	<div id="register-form" class="space-y-4">
		<div class="flex">
		<div class="mr-4 w-1/2">
			<label for="firstname" class="block text-sm font-medium text-[#ff00ff] my-2">Name</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">person</span>
			<input
				id="firstname"
				name="firstName"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="First name"
				required
			/>
			</div>
			</div>
			<div class="w-1/2">
			<label for="lastname" class="block text-sm font-medium text-[#ff00ff] my-2">Last Name</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">person</span>
			<input
				id="lastname"
				name="lastName"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Last name"
				required
			/>
			</div>
			</div>
		</div>

		<!-- Username -->
		<div>
			<label for="username" class="block text-sm font-medium text-[#ff00ff] my-2">
			Username
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">account_circle</span>
			<input
				id="username"
				name="username"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter a username"
				required
			/>
			</div>
			</div>

		<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-[#ff00ff] my-2">Email</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">mail</span>
			<input
				id="email"
				name="emailAddress"
				type="text"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Enter your email"
				required
			/>
			</div>
			</div>

			<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-[#ff00ff] my-2">
			Password
			</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="password"
				name="password"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Create a password"
				required
			/>
			<button
				type="button"
				id="toggle-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-[#ff00ff] focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			<div class="mt-4">
		<label for="confirm-password" class="block text-sm font-medium text-[#ff00ff] my-2">Confirm password</label>
			<div class="relative">
			<span class="material-symbols-outlined absolute left-3 top-2.5 text-white">lock</span>
			<input
				id="confirm-password"
				name="confirmPassword"
				type="password"
				style="box-shadow: 0 0 8px var(--primary-color);"
				class="block w-full pl-10 pr-3 py-3 bg-[--bg-color] border text-xs border-[--secondary-color] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-white"
				placeholder="Confirm your password"
				required
			/>
			<button
				type="button"
				id="toggle-confirm-password"
				aria-label="Toggle password visibility"
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-[#ff00ff] focus:outline-none"
				>
				<span class="material-symbols-outlined text-xl">visibility</span>
			</button>
			</div>
			</div>
		</div>

			<!-- Terms -->
		<div class="space-y-2">
			<div class="flex items-center">
			<input
				id="terms"
				name="terms"
				type="checkbox"
				class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
			/>
		<label for="terms" class="ml-2 block text-xs text-[#ff00ff]">
			I agree to the
      <button type="button" id="link-terms" class="underline hover:text-[#ff00ff]">
        Terms
      </button>
      &
      <button type="button" id="link-privacy" class="underline hover:text-[#ff00ff]">
        Privacy
      </button>
    </label>
  </div>

  <!-- Hidden mirrors so we can include preferences in submit -->
  <input id="pref-allow-collection" type="hidden" value="1" />
  <input id="pref-allow-processing" type="hidden" value="1" />
  <input id="pref-allow-ai" type="hidden" value="1" />
  <input id="pref-public-scores" type="hidden" value="1" />
</div>


      <div>
        <button id="submit-register-btn" class="w-full bg-[--secondary-color] text-sm font-medium text-white py-3 rounded-lg hover:bg-indigo-700 transition btn-primary">CREATE ACCOUNT</button>
      </div>
    </div>
	<!-- Terms & Privacy (Register-only) Modal -->
<div id="prefs-modal" class="hidden fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
  <div class="w-full max-w-md p-6 border border-[--primary-color] bg-[#1a0033] rounded-lg shadow-md">
    <h3 class="text-[#ff00ff] text-lg mb-3">Terms & Privacy</h3>

    <!-- Tabs -->
    <div class="mb-3 flex gap-2 text-xs">
      <button id="tab-terms" class="px-3 py-1 border rounded-md border-[--secondary-color] text-[--secondary-color]">Terms</button>
      <button id="tab-privacy" class="px-3 py-1 border rounded-md border-[--secondary-color] text-[--secondary-color]">Privacy</button>
    </div>

    <div class="text-[--secondary-color] text-xs space-y-3 max-h-56 overflow-auto mb-4">
      <!-- TERMS PANE -->
      <div id="pane-terms">
        <p class="mb-2"><strong>Terms of Use.</strong> By creating an account, you agree to use this service lawfully and comply with community rules. We may update these terms; continued use means you accept the latest version.</p>
        <p class="mb-2"><strong>Accounts & Security.</strong> Keep your credentials safe. You’re responsible for activity on your account. 2FA is available and recommended.</p>
        <p class="mb-2"><strong>Content.</strong> You retain your rights. You grant us a limited license to host/process your content to operate and improve the service.</p>
        <p class="mb-2"><strong>Liability.</strong> Service provided “as is”. Where permitted, we disclaim warranties and limit liability.</p>
      </div>

      <!-- PRIVACY PANE -->
      <div id="pane-privacy" class="hidden">
        <p class="mb-2"><strong>Privacy Policy & GDPR.</strong> We act as a data controller and process your personal data to provide and secure the service and improve features. Under the EU GDPR, you have rights to access, rectify, erase, restrict/object, data portability, and to withdraw consent at any time without affecting prior lawful processing. You can also lodge a complaint with your local supervisory authority.</p>
        <p class="mb-2"><strong>Retention & Transfers.</strong> Data is retained only as necessary. If we transfer data internationally, we implement appropriate safeguards.</p>
        <p class="mb-2"><strong>Contact.</strong> For privacy requests: <span class="underline">daviles-@42.com</span>.</p>

        <div class="mt-3 border border-[--secondary-color] rounded-md p-3 space-y-2">
          <p class="font-semibold text-[--secondary-color]">How we use data (what each option means):</p>
          <ul class="list-disc ml-5 space-y-1">
            <li><strong>Allow data collection (analytics, diagnostics)</strong> — lets us gather usage metrics and error logs to keep things stable and fix bugs.</li>
            <li><strong>Allow data processing (improving features)</strong> — permits using your in-product interactions to refine matchmaking, UI flows, and game balance.</li>
            <li><strong>Allow AI training on anonymized data</strong> — enables training models on **de-identified** aggregates; we remove direct identifiers and apply safeguards.</li>
            <li><strong>Show my scores publicly</strong> — allows showing your username and scores on leaderboards and social features.</li>
          </ul>
        </div>

        <!-- The same toggles you already had -->
        <div class="mt-3 border border-[--secondary-color] rounded-md p-3">
          <label class="flex items-center gap-2">
            <input id="opt-data-collection" type="checkbox" class="h-4 w-4" checked />
            <span class="text-xs">Allow data collection (analytics, diagnostics)</span>
          </label>
          <label class="flex items-center gap-2 mt-2">
            <input id="opt-data-processing" type="checkbox" class="h-4 w-4" checked />
            <span class="text-xs">Allow data processing (improving features)</span>
          </label>
          <label class="flex items-center gap-2 mt-2">
            <input id="opt-ai-training" type="checkbox" class="h-4 w-4" checked />
            <span class="text-xs">Allow AI training on anonymized data</span>
          </label>
          <label class="flex items-center gap-2 mt-2">
            <input id="opt-public-scores" type="checkbox" class="h-4 w-4" checked />
            <span class="text-xs">Show my scores publicly</span>
          </label>
        </div>

        <label class="flex items-center gap-2 mt-3">
          <input id="opt-accept-terms" type="checkbox" class="h-4 w-4" />
          <span class="text-xs">I have read and agree to the Terms & Privacy</span>
        </label>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button id="prefs-cancel" class="btn-secondary">Cancel</button>
      <button id="prefs-save" class="btn-primary">Save</button>
    </div>
  </div>
</div>

  `;
}

function initializeGoogleSignIn(retryCount = 0) {
	const maxRetries = 10;
	if (window.google && window.google.accounts?.id) {
		try {
			window.google.accounts.id.initialize({
				client_id: '723996318435-bavdbrolseqgqq06val5dc1sumgam12j.apps.googleusercontent.com',
				callback: window.handleCredentialResponse,
				auto_select: false,
				cancel_on_tap_outside: true,
			});
		} catch (error) {
			console.error('Error initializing Google Sign-In:', error);
		}
	} else if (retryCount < maxRetries) {
		setTimeout(() => initializeGoogleSignIn(retryCount + 1), 500);
	}
}

function setupAuthEvents(): void {
  el("sign-in-tab")?.addEventListener("click", () => {
    isLogin = true;
    renderAuthContainer();
  });
  el("sign-up-tab")?.addEventListener("click", () => {
    isLogin = false;
    renderAuthContainer();
  });

  el("google-login-btn")?.addEventListener("click", () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          console.log("Google Sign-In prompt not shown:", notification);
        }
      });
    } else {
      showAuthMessage(
        "Google Sign-In is not available. Please try again later.",
        "error",
        "google"
      );
    }
  });

  el("submit-login-btn")?.addEventListener("click", onLoginSubmit);
  addEnterSubmit("login-form", "submit-login-btn");

  const remember = el<HTMLInputElement>("remember-me");
  const emailInput = el<HTMLInputElement>("email");
  remember?.addEventListener("change", () => {
    const checked = !!remember.checked;
    localStorage.setItem("rememberMe", JSON.stringify(checked));
    if (!checked) {
      localStorage.removeItem("rememberEmail");
    } else if (checked && emailInput?.value) {
      localStorage.setItem("rememberEmail", emailInput.value);
    }
  });
  emailInput?.addEventListener("input", () => {
    const rememberChecked = JSON.parse(localStorage.getItem("rememberMe") || "false");
    if (rememberChecked) {
      localStorage.setItem("rememberEmail", emailInput.value);
    }
  });

  el("submit-register-btn")?.addEventListener("click", onRegisterSubmit);
  addEnterSubmit("register-form", "submit-register-btn");

  if (window.google && window.google.accounts?.id) {
    const buttonDiv = document.querySelector(".g_id_signin");
    if (buttonDiv) {
      window.google.accounts.id.renderButton(buttonDiv, {
        theme: "outline",
        size: "large",
        width: "100%",
        type: "standard",
        logo_alignment: "left",
        text: "signin_with",
        shape: "rect",
      } as any);
    }
  }

  el("toggle-password")?.addEventListener("click", () => toggleInputVisibility("password"));
  el("toggle-confirm-password")?.addEventListener("click", () =>
    toggleInputVisibility("confirm-password")
  );
  el("toggle-forgot-password")?.addEventListener("click", () =>
    toggleInputVisibility("forgot-newpass")
  );

  ["email", "password", "firstname", "lastname", "username", "confirm-password"].forEach(
    (id) => {
      el(id)?.addEventListener("input", () => {
        ["login-result", "register-result"].forEach((x) => {
          const n = el(x);
          if (n) {
            n.classList.add("hidden");
            n.innerHTML = "";
          }
        });
      });
    }
  );

  el("forgot-password-btn")?.addEventListener("click", openForgotModal);

// open modal on inline words (only exists in register view)
el("link-terms")?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation(); // don't toggle the checkbox
  el("prefs-modal")?.classList.remove("hidden");
  setPrefsTab("terms");
});

el("link-privacy")?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  el("prefs-modal")?.classList.remove("hidden");
  setPrefsTab("privacy");
});

// modal controls (register-only guards)
el("prefs-cancel")?.addEventListener("click", () => {
  el("prefs-modal")?.classList.add("hidden");
});

el("tab-terms")?.addEventListener("click", () => setPrefsTab("terms"));
el("tab-privacy")?.addEventListener("click", () => setPrefsTab("privacy"));

// keep your existing prefs-save logic, but it now only runs on register view
el("prefs-save")?.addEventListener("click", () => {
  const allowCollection = el<HTMLInputElement>("opt-data-collection")?.checked ? "1" : "0";
  const allowProcessing = el<HTMLInputElement>("opt-data-processing")?.checked ? "1" : "0";
  const allowAi        = el<HTMLInputElement>("opt-ai-training")?.checked ? "1" : "0";
  const publicScores   = el<HTMLInputElement>("opt-public-scores")?.checked ? "1" : "0";
  const accepted       = !!el<HTMLInputElement>("opt-accept-terms")?.checked;

  if (!accepted) {
    showAuthMessage("Please check 'I have read and agree…' before saving.", "warning", "register");
    return;
  }

  (el<HTMLInputElement>("pref-allow-collection")!).value = allowCollection;
  (el<HTMLInputElement>("pref-allow-processing")!).value = allowProcessing;
  (el<HTMLInputElement>("pref-allow-ai")!).value         = allowAi;
  (el<HTMLInputElement>("pref-public-scores")!).value    = publicScores;

  // reflect acceptance on the main consent box
  const termsCb = el<HTMLInputElement>("terms");
  if (termsCb) termsCb.checked = true;

  el("prefs-modal")?.classList.add("hidden");
});

}

function setPrefsTab(tab: "terms" | "privacy") {
  const tBtn = el("tab-terms");
  const pBtn = el("tab-privacy");
  const tPane = el("pane-terms");
  const pPane = el("pane-privacy");
  if (!tBtn || !pBtn || !tPane || !pPane) return;

  if (tab === "terms") {
    tPane.classList.remove("hidden");
    pPane.classList.add("hidden");
    tBtn.classList.add("bg-[#2b0a52]","text-white");
    pBtn.classList.remove("bg-[#2b0a52]","text-white");
  } else {
    pPane.classList.remove("hidden");
    tPane.classList.add("hidden");
    pBtn.classList.add("bg-[#2b0a52]","text-white");
    tBtn.classList.remove("bg-[#2b0a52]","text-white");
  }
}

async function onLoginSubmit(e: Event) {
		e.preventDefault();
		const usernameOrEmail = el<HTMLInputElement>("email")?.value?.trim();
		const password = el<HTMLInputElement>("password")?.value;

		if (!usernameOrEmail || !password) {
			showAuthMessage("Please fill in all fields", "warning", "login");
			return;
		}

		try {
			const loginData: LoginRequest = {
				username: usernameOrEmail,
				password
			};
			const response = await apiService.login(loginData);

			if (response.status === 202 && response.requires2FA) {
			pendingLoginChallenge = response.challenge || null;
			showAuthMessage(
				"Two-factor authentication required. Please enter your code.",
				"info",
				"global"
			);
			show2FA(false);
			return;
			}

			if (response.success) {
			hideAuthMessages();
			navigateTo("home");
			return;
			}

			const { message, variant } = normalizeBackendError(response);
			showAuthMessage(message, variant || "error", "login");
		} catch (err) {
			console.error("Login error:", err);
			showAuthMessage("Something went wrong. Try again.", "error", "login");
		}
	}

async function onRegisterSubmit(e: Event) {
  e.preventDefault();
  const firstName = el<HTMLInputElement>("firstname")?.value?.trim();
  const lastName = el<HTMLInputElement>("lastname")?.value?.trim();
  const username = el<HTMLInputElement>("username")?.value?.trim();
  const email = el<HTMLInputElement>("email")?.value?.trim();
  const password = el<HTMLInputElement>("password")?.value;
  const confirmPassword = el<HTMLInputElement>("confirm-password")?.value;
	const terms = el<HTMLInputElement>("terms")?.checked;
	const allowDataCollection = el<HTMLInputElement>("pref-allow-collection")?.value === "1";
const allowDataProcessing = el<HTMLInputElement>("pref-allow-processing")?.value === "1";
const allowAiTraining     = el<HTMLInputElement>("pref-allow-ai")?.value === "1";
const showScoresPublicly  = el<HTMLInputElement>("pref-public-scores")?.value === "1";

  if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
    showAuthMessage("Please fill in all fields", "warning", "register");
    return;
  }
  if (!terms) {
    showAuthMessage("Please accept the Terms & Privacy to continue.", "warning", "register");
    return;
  }
  if (username.length < 3) {
    showAuthMessage("Username must be at least 3 characters long.", "warning", "register");
    return;
  }
  if (password.length < 8) {
    showAuthMessage("Password must be at least 8 characters long.", "warning", "register");
    return;
  }
  if (password !== confirmPassword) {
    showAuthMessage("Passwords do not match", "warning", "register");
    return;
  }

  try {
    const registerData: RegisterRequest = {
  firstName,
  lastName,
  username,
  email,
  password,
  allowDataCollection,
  allowDataProcessing,
  allowAiTraining,
  showScoresPublicly,
};


			const response = await apiService.register(registerData);

			if (response.success) {
			try {
				const setup = await apiService.setup2FA();
				show2FA(true, setup?.qrCode || "");
			} catch (e) {
				console.warn("2FA setup could not start right now:", e);
				hideAuthMessages();
				navigateTo("home");
			}
			return;
			}

			const { message, variant } = normalizeBackendError(response);
			showAuthMessage(message, variant || "error", "register");
		} catch (err: any) {
			console.error("Registration error:", err);
			showAuthMessage("Something went wrong. Try again.", "error", "register");
		}
		}

function openForgotModal() {
  const modal = el("forgot-modal");
  const step1 = el("forgot-step-1");
  const step2 = el("forgot-step-2");
  const emailInput = el<HTMLInputElement>("forgot-email");
  const otpInput = el<HTMLInputElement>("forgot-otp");
  const backupInput = el<HTMLInputElement>("forgot-backup");
  const newPassInput = el<HTMLInputElement>("forgot-newpass");

  if (!modal || !step1 || !step2) return;

  hideAuthMessages();

  const rememberedEmail = localStorage.getItem("rememberEmail") || "";
  if (emailInput) emailInput.value = rememberedEmail;
  if (otpInput) otpInput.value = "";
  if (backupInput) backupInput.value = "";
  if (newPassInput) newPassInput.value = "";

  step1.classList.remove("hidden");
  step2.classList.add("hidden");
  modal.classList.remove("hidden");

  el("forgot-cancel-btn")?.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  el("forgot-send-btn")?.addEventListener("click", onForgotSend);
  addEnterSubmit("forgot-step-1", "forgot-send-btn");

  el("forgot-back-btn")?.addEventListener("click", () => {
    step2.classList.add("hidden");
    step1.classList.remove("hidden");
    const r = el("forgot-result");
    if (r) {
      r.classList.add("hidden");
      r.innerHTML = "";
    }
  });

  let forgotUseBackup = false;
  el("forgot-toggle-mode")?.addEventListener("click", () => {
    forgotUseBackup = !forgotUseBackup;
    if (forgotUseBackup) {
      otpInput?.classList.add("hidden");
      backupInput?.classList.remove("hidden");
      (el("forgot-toggle-mode") as HTMLElement).textContent =
        "Use email OTP instead";
      backupInput?.focus();
    } else {
      otpInput?.classList.remove("hidden");
      backupInput?.classList.add("hidden");
      (el("forgot-toggle-mode") as HTMLElement).textContent =
        "Use backup code instead";
      otpInput?.focus();
    }
  });

  el("forgot-reset-btn")?.addEventListener("click", (ev) =>
    onForgotReset(ev, forgotUseBackup)
  );
  addEnterSubmit("forgot-step-2", "forgot-reset-btn");
}

async function onForgotSend(e: Event) {
  e.preventDefault();
  const email = el<HTMLInputElement>("forgot-email")?.value?.trim();
  if (!email) {
    showAuthMessage("Please enter your email address.", "warning", "forgot");
    return;
  }

  try {
    const res =
      (await (apiService as any).requestPasswordReset?.({ email })) ??
      { success: true };

    if (res.success) {
      showAuthMessage(
        "We’ve sent a 6-digit code to your email. Enter it below (or use a backup code if you have 2FA).",
        "info",
        "forgot"
      );
      el("forgot-step-1")?.classList.add("hidden");
      el("forgot-step-2")?.classList.remove("hidden");
      el<HTMLInputElement>("forgot-otp")?.focus();
    } else {
      const { message, variant } = normalizeBackendError(res);
      showAuthMessage(message, variant || "error", "forgot");
    }
  } catch (err) {
    console.error("Forgot send error:", err);
    showAuthMessage("Failed to start password reset. Try again.", "error", "forgot");
  }
}

async function onForgotReset(e: Event, useBackup: boolean) {
  e.preventDefault();
  const email = el<HTMLInputElement>("forgot-email")?.value?.trim();
  const otp = el<HTMLInputElement>("forgot-otp")?.value?.trim();
  const backup = el<HTMLInputElement>("forgot-backup")?.value?.trim();
  const newPassword = el<HTMLInputElement>("forgot-newpass")?.value || "";

  if (!email) {
    showAuthMessage("Missing email.", "warning", "forgot");
    return;
  }
  if (newPassword.length < 8) {
    showAuthMessage("New password must be at least 8 characters.", "warning", "forgot");
    return;
  }

  try {
    let res: any;
    if (useBackup) {
      if (!backup || backup.length !== 8) {
        showAuthMessage("Please enter your 8-character backup code.", "warning", "forgot");
        return;
      }
      res =
        (await (apiService as any).resetPasswordWithBackup?.({
          email,
          backupCode: backup,
          newPassword,
        })) ?? { success: true };
    } else {
      if (!otp || otp.length !== 6) {
        showAuthMessage("Please enter the 6-digit OTP sent to your email.", "warning", "forgot");
        return;
      }
      res =
        (await (apiService as any).resetPasswordWithOtp?.({
          email,
          otp,
          newPassword,
        })) ?? { success: true };
    }

    if (res.success) {
      showAuthMessage("Password reset successful. You can now sign in.", "success", "forgot");
      setTimeout(() => {
        el("forgot-modal")?.classList.add("hidden");
      }, 700);
    } else {
      const { message, variant } = normalizeBackendError(res);
      showAuthMessage(message, variant || "error", "forgot");
    }
  } catch (err) {
    console.error("Forgot reset error:", err);
    showAuthMessage("Could not reset password. Please try again.", "error", "forgot");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderAuthContainer();
});

function show2FA(isRegistering: boolean, qrCodeData?: string): void {
	const container = el("twofa-container");
	const authContainer = el("auth-form-container");
	const qrWrapper = el("qrcode-wrapper");
	const registerText = el("twofa-mode-register");
	const loginText = el("twofa-mode-login");
	const backupLabel = el("backup-mode-login");
	const submit2FAbtn = el("submit-twofa-btn");
	const qrImg = el<HTMLImageElement>("qrcode-img");
	const toggleBackupBtn = el("toggle-backup-btn");
	const skipBtn = el("skip-twofa-btn");

	if (!container || !authContainer || !qrWrapper || !registerText || !loginText) {
		console.warn("2FA elements missing");
		return;
	}

	container.classList.remove("hidden");
	authContainer.classList.add("hidden");

	if (isRegistering) {
		qrWrapper.classList.remove("hidden");
		registerText.classList.remove("hidden");
		loginText.classList.add("hidden");
		backupLabel?.classList.add("hidden");
		toggleBackupBtn?.classList.add("hidden");
		skipBtn?.classList.remove("hidden");
	} else {
		qrWrapper.classList.add("hidden");
		registerText.classList.add("hidden");
		loginText.classList.remove("hidden");
		backupLabel?.classList.add("hidden");
		toggleBackupBtn?.classList.remove("hidden");
		skipBtn?.classList.add("hidden");
	}

	if (qrCodeData && qrImg) qrImg.src = qrCodeData;

	el("back-to-auth")?.addEventListener("click", () => {
		container.classList.add("hidden");
		authContainer.classList.remove("hidden");
		if (!isRegistering) pendingLoginChallenge = null;
	});

	skipBtn?.addEventListener("click", () => {
		container.classList.add("hidden");
		hideAuthMessages();
		navigateTo("home");
	});

	const twofaCodeInput = el<HTMLInputElement>("twofa-code");
	const backupCodeInput = el<HTMLInputElement>("backup-code");
	const twofaModeLogin = el("twofa-mode-login");
	const backupModeLogin = el("backup-mode-login");

	let isBackupMode = false;

	toggleBackupBtn?.addEventListener("click", () => {
		isBackupMode = !isBackupMode;

		if (isBackupMode) {
			twofaCodeInput?.classList.add("hidden");
			backupCodeInput?.classList.remove("hidden");
			twofaModeLogin?.classList.add("hidden");
			backupModeLogin?.classList.remove("hidden");
			(toggleBackupBtn as HTMLElement).textContent = "Use authenticator code instead";
			backupCodeInput?.focus();
		} else {
			twofaCodeInput?.classList.remove("hidden");
			backupCodeInput?.classList.add("hidden");
			twofaModeLogin?.classList.remove("hidden");
			backupModeLogin?.classList.add("hidden");
			(toggleBackupBtn as HTMLElement).textContent = "Use backup code instead";
			twofaCodeInput?.focus();
		}

		if (twofaCodeInput) twofaCodeInput.value = "";
		if (backupCodeInput) backupCodeInput.value = "";
	});

	submit2FAbtn?.addEventListener("click", async () => {
		const twofaCodeInput = el<HTMLInputElement>("twofa-code");
		const backupCodeInput = el<HTMLInputElement>("backup-code");

		const isUsingBackupInLogin = !isRegistering && !backupCodeInput?.classList.contains("hidden");
		const code = isUsingBackupInLogin
			? backupCodeInput?.value?.trim()
			: twofaCodeInput?.value?.trim();

		if (!code) {
			showAuthMessage("Please enter your code.", "warning", "twofa");
			return;
		}
		if (!isUsingBackupInLogin && code.length !== 6) {
			showAuthMessage("Please enter a valid 6-digit code.", "warning", "twofa");
			return;
		}
		if (isUsingBackupInLogin && code.length !== 8) {
			showAuthMessage("Please enter a valid 8-character backup code.", "warning", "twofa");
			return;
		}

		try {
			let result: any;

			if (isRegistering) {
				result = await apiService.verify2FA({ token: code });
				if (result?.success) {
					hideAuthMessages();
					navigateTo("home");
					pendingLoginChallenge = null;
					return;
				}
			} else {
				if (!pendingLoginChallenge) {
					showAuthMessage("Your 2FA session expired. Please sign in again.", "warning", "twofa");
					return;
				}
				result = await apiService.login2FA({ challenge: pendingLoginChallenge, code });
				if (result?.success) {
					hideAuthMessages();
					navigateTo("home");
					pendingLoginChallenge = null;
					return;
				}
			}
			const { message, variant } = normalizeBackendError(result);
			showAuthMessage(message, variant || "error", "twofa");
		} catch (err) {
			console.error("2FA submit error:", err);
			showAuthMessage("Something went wrong. Try again.", "error", "twofa");
		}
	});
}

	function addEnterSubmit(containerId: string, submitBtnId: string) {
		const cont = el(containerId);
		if (!cont) return;
		cont.addEventListener("keydown", (ev: KeyboardEvent) => {
			if (ev.key === "Enter") {
				ev.preventDefault();
				el(submitBtnId)?.dispatchEvent(new Event("click", { bubbles: true }));
			}
		});
	}

	function toggleInputVisibility(inputId: string) {
		const i = el<HTMLInputElement>(inputId);
		if (!i) return;
		i.type = i.type === "password" ? "text" : "password";
	}

	function escapeHtml(s: string) {
		return s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

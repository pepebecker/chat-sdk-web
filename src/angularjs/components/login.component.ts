import * as angular from 'angular';
import * as firebase from 'firebase';

import * as Defines from '../keys/defines';
import { N } from '../keys/notification-keys';
import { Utils } from '../services/utils';
import { LoginMode } from '../keys/login-mode-keys';
import { NotificationType } from '../keys/notification-type';
import { IRootScope } from '../interfaces/root-scope';
import { IFriendsConnector } from '../connectors/friend-connector';
import { IPresence } from '../network/presence';
import { ILocalStorage } from '../persistence/local-storage';
import { IConfig } from '../services/config';
import { IAuth } from '../network/auth';
import { ICredential } from '../network/credential';
import { IAutoLogin } from '../network/auto-login';
import { INotification } from './notification.component';
import { IEnvironment } from '../services/environment';

class LoginController {

  static $inject = ['$rootScope', 'FriendsConnector', 'Presence', 'LocalStorage', 'Config', 'Auth', 'Credential', 'AutoLogin', 'Environment'];

  config = this.Config;
  loginMode: string;
  email: string;
  password: string;
  passwordFocus: any;
  showError: boolean;
  errorMessage: string;
  rememberMe: boolean;
  loginURL: string;
  registerURL: string;
  websiteName: string;

  // Bindings
  notification: INotification;

  // Images
  img_loader: string;
  img_30_start_chatting: string;

  /**
   * Initialize the login controller
   * Add listeners to AngularFire login, logout and error broadcasts
   * Setup the auth variable and try to authenticate
   */
  constructor(
    private $rootScope: IRootScope,
    private FriendsConnector: IFriendsConnector,
    private Presence: IPresence,
    private LocalStorage: ILocalStorage,
    private Config: IConfig,
    private Auth: IAuth,
    private Credential: ICredential,
    private AutoLogin: IAutoLogin,
    private Environment: IEnvironment,
  ) {
    this.img_loader = this.Environment.imagesURL() + 'loader.gif';
    this.img_30_start_chatting = this.Environment.imagesURL() + 'cc-30-start-chatting.png';

    this.$rootScope.$broadcast(Defines.ShowLoginBox, LoginMode.Authenticating);

    if (this.AutoLogin.autoLoginEnabled()) {
    }

    firebase.auth().onAuthStateChanged(() => {
      if (!Auth.isAuthenticating()) {
        this.authenticate.bind(this)(null);
      }
    });

    this.$rootScope.$on(Defines.SetLoginMode, (_, mode: LoginMode) => {
      this.loginMode = mode ? mode : this.Auth.mode;
    });
  }

  startChatting() {
    this.LocalStorage.setLastVisited();
    this.authenticate(null);
  }

  async authenticate(credential: ICredential) {
    this.$rootScope.$broadcast(Defines.ShowLoginBox, LoginMode.Authenticating);

    try {
      const authUser = await this.Auth.authenticate(credential);
      this.handleAuthData(authUser);
    }
    catch (error) {
      if (!Utils.unORNull(error)) {
        this.handleLoginError(error);
      }
      else {
        this.$rootScope.$broadcast(Defines.ShowLoginBox, this.getLoginMode());
      }
    }
  }

  getLoginMode(): LoginMode {
    let loginMode = LoginMode.Simple;
    const lastVisited = this.LocalStorage.getLastVisited();

    // We don't want to load the messenger straightaway to save bandwidth.
    // This will check when they last accessed the chat. If it was less than the timeout time ago,
    // then the click to chat box will be displayed. Clicking that will reset the timer
    if (Utils.unORNull(lastVisited) || (new Date().getTime() - lastVisited) / 1000 > this.Config.clickToChatTimeout && this.Config.clickToChatTimeout > 0) {
      loginMode = LoginMode.ClickToChat;
    }
    return loginMode;
  }

  handleAuthData(authData) {
    this.$rootScope.$broadcast(Defines.SetLoginMode, this.Auth.mode);

    console.log(authData);

    this.$rootScope.auth = authData;
    if (authData) {
      this.handleLoginComplete(false);
    }
    else {
      this.$rootScope.$broadcast(Defines.ShowLoginBox);
    }
  }

  setError(message: string) {
    this.showError = !Utils.unORNull(message);
    this.errorMessage = message;
  }

  loginWithPassword() {
    this.login(this.Credential.emailAndPassword(this.email, this.password));
  }

  loginWithFacebook() {
    this.login(this.Credential.facebook());
  }

  loginWithTwitter() {
    this.login(this.Credential.twitter());
  }

  loginWithGoogle() {
    this.login(this.Credential.google());
  }

  loginWithGithub() {
    this.login(this.Credential.github());
  }

  loginWithAnonymous() {
    this.login(this.Credential.anonymous());
  }

  /**
   * Log the user in using the appropriate login method
   * @param method - the login method: facebook, twitter etc...
   * @param options - hash of options: remember me etc...
   */
  async login(credential: ICredential) {

    // TODO: Move this to a service!
    // Re-establish a connection with Firebase
    this.Presence.goOnline();

    // Reset any error messages
    this.showError = false;

    // Hide the overlay
    this.$rootScope.$broadcast(Defines.ShowNotification, NotificationType.Waiting, 'Logging in', 'For social login make sure to enable popups!');

    try {
      const authData = await this.Auth.authenticate(credential);
      this.handleAuthData(authData);
    }
    catch (error) {
      this.$rootScope.$broadcast(Defines.HideNotification);
      this.handleLoginError(error);
    }
  }

  async forgotPassword(email: string) {
    try {
      await this.Auth.resetPasswordByEmail(email);
      this.$rootScope.$broadcast(Defines.ShowNotification, NotificationType.Alert, 'Email sent', 'Instructions have been sent. Please check your Junk folder!', 'ok');
      this.setError(null);
    }
    catch (error) {
      this.handleLoginError(error);
    }
  }

  /**
   * Create a new account
   * @param email - user's email
   * @param password - user's password
   */
  async signUp(email: string, password: string) {

    // Re-establish connection with Firebase
    this.Presence.goOnline();

    this.showError = false;

    this.$rootScope.$broadcast(Defines.ShowNotification, NotificationType.Waiting, 'Registering...');

    // First create the super

    try {
      await this.Auth.signUp(email, password);
      this.email = email;
      this.password = password;
      this.loginWithPassword();
    }
    catch (error) {
      this.handleLoginError(error);
    }
  }

  /**
   * Bind the user to Firebase
   * Using the user's authentcation information create
   * a three way binding to the user property
   * @param userData - User object from Firebase authentication
   * @param firstLogin - Has the user just signed up?
   */
  handleLoginComplete(firstLogin: boolean) {

    // Write a record to the firebase to record this API key
    this.$rootScope.$broadcast(Defines.ShowNotification, NotificationType.Waiting, 'Opening Chat...');

    // Load friends from config
    if (this.Config.friends) {
      this.FriendsConnector.addFriendsFromConfig(this.Config.friends);
    }

    // This allows us to clear the cache remotely
    this.LocalStorage.clearCacheWithTimestamp(this.Config.clearCacheTimestamp);

    // We have the user's ID so we can get the user's object
    if (firstLogin) {
      this.$rootScope.$broadcast(Defines.ShowProfileSettingsBox);
    }
    else {
      this.$rootScope.$broadcast(Defines.ShowMainBox);
    }

    this.$rootScope.$broadcast(N.LoginComplete);
    this.$rootScope.$broadcast(Defines.HideNotification);

  }

  /**
   * Handle a login error
   * Show a red warning box in the UI with the
   * error message
   * @param error - error returned from Firebase
   */
  handleLoginError(error: any) {

    // The login failed - display a message to the user
    this.$rootScope.$broadcast(Defines.HideNotification);

    let message = error.message || 'An unknown error occurred';

    if (error.code === 'AUTHENTICATION_DISABLED') {
      message = 'This authentication method is currently disabled.';
    }
    if (error.code === 'EMAIL_TAKEN') {
      message = 'Email address unavailable.';
    }
    if (error.code === 'INVALID_EMAIL') {
      message = 'Please enter a valid email.';
    }
    if (error.code === 'INVALID_ORIGIN') {
      message = 'Login is not available from this domain.';
    }
    if (error.code === 'INVALID_PASSWORD') {
      message = 'Please enter a valid password.';
    }
    if (error.code === 'INVALID_USER') {
      message = 'Invalid email or password.';
    }
    if (error.code === 'INVALID_USER') {
      message = 'Invalid email or password.';
    }
    if (error.code === 'ALREADY_AUTHENTICATING') {
      message = 'Already Authenticating';
    }

    this.setError(message);
    console.error(message);
  }

}

// angular.module('myApp.controllers').controller('LoginController', LoginController);
angular.module('myApp.components').component('loginBox', {
  templateUrl: '/assets/partials/login-box.html',
  controller: LoginController,
  controllerAs: 'ctrl',
  bindings: {
    notification: '<'
  },
});

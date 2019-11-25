import * as angular from 'angular';

import { IConfig } from '../services/config';
import { INotification } from './notification.component';

class ErrorBoxController {

  static $inject = ['Config'];

  config = this.Config;

  // Bindings
  errorBoxMessage: string;
  notification: INotification;

  constructor(private Config: IConfig) { }

}

angular.module('myApp.components').component('errorBox', {
  templateUrl: '/assets/partials/error-box.html',
  controller: ErrorBoxController,
  controllerAs: 'ctrl',
  bindings: {
    errorBoxMessage: '<',
    notification: '<',
  },
});

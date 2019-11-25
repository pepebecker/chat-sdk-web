import * as angular from 'angular';

export interface INotification {
  show: boolean;
  title: string;
  message: string;
  type: string;
  button: string;
}

class NotificationController {

  // Bindings
  notification: INotification;

  submit() {
    this.notification.show = false;
  }

}

angular.module('myApp.components').component('notification', {
  templateUrl: '/assets/partials/notification.html',
  controller: NotificationController,
  controllerAs: 'ctrl',
  bindings: {
    notification: '<'
  }
});

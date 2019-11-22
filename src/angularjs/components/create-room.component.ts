import * as angular from 'angular';

import { ShowCreateChatBox } from '../keys/defines';
import { RoomType } from '../keys/room-type';
import { IConfig } from '../services/config';
import { IRoomCreator } from '../services/room-creator';
import { IRoomOpenQueue } from '../services/room-open-queue';
import { Log } from '../services/log';

export interface ICreateRoomOptions {
  invitesEnabled: boolean;
  name: string;
  description: string;
}

class CreateRoomController {

  static $inject = ['$scope', 'Config', 'RoomCreator', 'RoomOpenQueue'];

  config: IConfig;
  focusName: boolean;
  public: boolean;
  roomOptions: ICreateRoomOptions;

  // Bindings
  showMainBox: () => void;

  constructor(
    private $scope: ng.IScope,
    private Config: IConfig,
    private RoomCreator: IRoomCreator,
    private RoomOpenQueue: IRoomOpenQueue,
  ) {
    this.config = this.Config;

    this.clearForm();

    this.$scope.$on(ShowCreateChatBox, () => {
      Log.notification(ShowCreateChatBox, 'CreateRoomController');
      this.focusName = true;
    });
  }

  async createRoom() {
    try {
      const room = await (() => {
        // Is this a public room?
        if (this.public) {
          return this.RoomCreator.createAndPushPublicRoom(
            this.roomOptions.name,
            this.roomOptions.description
          );
        }
        else {
          return this.RoomCreator.createAndPushRoom(
            null,
            this.roomOptions.name,
            this.roomOptions.description,
            this.roomOptions.invitesEnabled,
            RoomType.OneToOne,
            true,
          );
        }
      })();
      if (room) {
        this.RoomOpenQueue.addRoomWithID(room.getRID());
        room.open(0);
      } else {
        console.error('room is', room);
      }
    } catch (error) {
      console.error(error);
    }

    this.back();
  }

  back() {
    this.clearForm();
    this.showMainBox();
  }

  clearForm() {
    this.roomOptions = {
      invitesEnabled: false,
      name: null,
      description: null
    };
  }

}

angular.module('myApp.components').component('createRoomBox', {
  templateUrl: '/assets/partials/create-room-box.html',
  controller: CreateRoomController,
  controllerAs: 'ctrl',
  bindings: {
    showMainBox: '<'
  }
});

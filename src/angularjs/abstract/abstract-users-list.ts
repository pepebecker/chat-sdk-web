import { N } from '../keys/notification-keys';
import { Log } from '../services/log';
import { RoomType } from '../keys/room-type';
import { IRoom } from '../entities/room';
import { IUser } from '../entities/user';
import { ICache } from '../persistence/cache';
import { IUserStore } from '../persistence/user-store';
import { IRoomStore } from '../persistence/room-store';
import { IRoomCreator } from '../services/room-creator';
import { IRoomOpenQueue } from '../services/room-open-queue';
import { IProfileBox } from '../services/profile-box.service';

export class AbstractUsersListController {

  static $inject = ['$rootScope', 'Cache', 'UserStore', 'RoomStore', 'RoomCreator', 'RoomOpenQueue', 'ProfileBox'];

  room: IRoom;
  users = Array<IUser>();

  constructor(
    protected $rootScope: ng.IRootScopeService,
    protected Cache: ICache,
    protected UserStore: IUserStore,
    protected RoomStore: IRoomStore,
    protected RoomCreator: IRoomCreator,
    protected RoomOpenQueue: IRoomOpenQueue,
    protected ProfileBox: IProfileBox,
  ) {
    if (this.constructor === AbstractUsersListController) {
      throw new Error('AbstractUsersListController can\'t be instantiated.');
    }

    this.$rootScope.$on(N.UserBlocked, () => {
      Log.notification(N.UserBlocked, 'AbstractUsersListController');
      this.updateList();
    });

    this.$rootScope.$on(N.UserUnblocked, () => {
      Log.notification(N.UserUnblocked, 'AbstractUsersListController');
      this.updateList();
    });

    // TODO: A bit hacky
    this.$rootScope.$on(N.RoomUpdated, (event, room) => {
      Log.notification(N.RoomUpdated, 'AbstractUsersListController');
      if (room === this.room) {
        this.updateList();
      }
    });

    this.$rootScope.$on(N.Logout, this.updateList.bind(this));
  }

  updateList() {
    throw new Error('Method \'updateList()\' must be implemented.');
  }

  showProfileBox(uid: string) {
    this.ProfileBox.show(uid);
  }

  userClicked(user: IUser) {
    // Is the user blocked?
    if (this.Cache.isBlockedUser(user.uid())) {
      this.UserStore.currentUser().unblockUser(user);
    }
    else {
      // Check to see if there's an open room with the two users
      let rooms = this.Cache.getPrivateRoomsWithUsers(this.UserStore.currentUser(), user);
      if (rooms.length) {
        const r = rooms[0];
        if (r.getType() === RoomType.OneToOne) {
          r.flashHeader();
          // The room is already open! Do nothing
          return;
        }
      }
      else {
        rooms = this.RoomStore.getPrivateRoomsWithUsers(this.UserStore.currentUser(), user);
        if (rooms.length) {
          const room = rooms[0];
          room.open(0);
          return;
        }
      }
      this.RoomCreator.createAndPushPrivateRoom([user]).then((room) => {
        this.RoomOpenQueue.addRoomWithID(room.rid());
        room.open(0);
        // let room = RoomStore.getOrCreateRoomWithID(rid);
      }, (error) => {
        console.log(error);
      });
    }
  }

}

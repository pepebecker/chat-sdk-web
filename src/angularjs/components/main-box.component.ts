import * as angular from 'angular';

import * as Defines from '../keys/defines';
import { N } from '../keys/notification-keys';
import { FriendsTab, InboxTab, RoomsTab, UsersTab } from '../keys/tab-keys';
import { Dimensions } from '../keys/dimensions';
import { ArrayUtils } from '../services/array-utils';
import { Log } from '../services/log';
import { IFriendsConnector } from '../connectors/friend-connector';
import { IConfig } from '../services/config';
import { IScreen } from '../services/screen';
import { IRoomStore } from '../persistence/room-store';
import { IRoom } from '../entities/room';
import { IUser } from '../entities/user';
import { ISearch } from '../services/search.service';
import { ITabService, ITab } from '../services/tab.service';
import { IUserStore } from '../persistence/user-store';
import { IEnvironment } from '../services/environment';

export interface IMainBoxScope extends ng.IScope {
  boxWidth: number;
  canCloseRoom: boolean;
}

class MainBoxController {

  static $inject = ['$rootScope', '$scope', 'FriendsConnector', 'Config', 'Screen', 'RoomStore', 'UserStore', 'Search', 'TabService', 'Environment'];

  mainBoxHeight = Dimensions.MainBoxHeight;
  mainBoxWidth = Dimensions.MainBoxWidth;
  config = this.Config;
  activeTab: ITab;
  searchQuery = '';
  friendsTabEnabled = true;
  roomsTabEnabled = true;
  usersTabEnabled = true;
  inboxCount = 0;
  tabCount = 1;

  img_30_minimize: string;
  img_30_plus: string;
  img_30_gear: string;

  constructor(
    private $rootScope: ng.IRootScopeService,
    private $scope: IMainBoxScope,
    private FriendsConnector: IFriendsConnector,
    private Config: IConfig,
    private Screen: IScreen,
    private RoomStore: IRoomStore,
    private UserStore: IUserStore,
    private Search: ISearch,
    private TabService: ITabService,
    private Environment: IEnvironment,
  ) {
    this.img_30_minimize = this.Environment.imagesURL() + 'cc-30-minimize.png';
    this.img_30_plus = this.Environment.imagesURL() + 'cc-30-plus.png';
    this.img_30_gear = this.Environment.imagesURL() + 'cc-30-gear.png';

    // Work out how many tabs there are
    this.$rootScope.$on(N.ConfigUpdated, () => {
      this.updateConfig.bind(this)();
    });
    this.updateConfig();

    // Setup the search variable - if we don't do this
    // Angular can't set search.text
    this.Search.setQueryForTab(UsersTab, '');
    this.Search.setQueryForTab(RoomsTab, '');
    this.Search.setQueryForTab(FriendsTab, '');

    // This is used by sub views for their layouts
    this.$scope.boxWidth = Dimensions.MainBoxWidth;

    // We don't want people deleting rooms from this view
    this.$scope.canCloseRoom = false;

    // When the user value changes update the user interface
    this.$rootScope.$on(N.UserValueChanged, () => {
      Log.notification(N.UserValueChanged, 'MainBoxController');
    });

    this.updateMainBoxSize();
    this.$rootScope.$on(N.ScreenSizeChanged, () => {
      Log.notification(N.ScreenSizeChanged, 'MainBoxController');
      this.updateMainBoxSize.bind(this)();
    });

    this.$rootScope.$on(N.RoomBadgeChanged, () => {
      Log.notification(N.RoomBadgeChanged, 'MainBoxController');
      this.updateInboxCount.bind(this)();
    });

    this.$rootScope.$on(N.LoginComplete, () => {
      Log.notification(N.RoomRemoved, 'InboxRoomsListController');
      this.updateInboxCount.bind(this)();
    });

    this.TabService.activeTabForMainBoxObservable().subscribe(tab => {
      this.activeTab = tab;
      this.searchQuery = Search.getQueryForActiveTab();
    });
  }

  searchQueryDidChange() {
    this.Search.setQueryForActiveTab(this.searchQuery);
  }

  updateConfig() {
    this.usersTabEnabled = this.Config.onlineUsersEnabled;
    this.roomsTabEnabled = this.Config.publicRoomsEnabled;
    this.friendsTabEnabled = this.Config.friendsEnabled;

    this.tabCount = this.numberOfTabs();

    // Make the users tab start clicked
    if (this.Config.onlineUsersEnabled) {
      this.tabClicked(UsersTab);
    }
    else if (this.Config.publicRoomsEnabled) {
      this.tabClicked(RoomsTab);
    }
    else {
      this.tabClicked(InboxTab);
    }
  }

  numberOfTabs(): number {
    let tabs = 1;
    if (this.Config.onlineUsersEnabled) {
      tabs++;
    }
    if (this.Config.publicRoomsEnabled) {
      tabs++;
    }
    if (this.Config.friendsEnabled) {
      tabs++;
    }
    return tabs;
  }

  updateInboxCount() {
    this.inboxCount = this.RoomStore.inboxBadgeCount();
  }

  updateMainBoxSize() {
    this.mainBoxHeight = Math.max(this.Screen.screenHeight * 0.5, Dimensions.MainBoxHeight);
    this.mainBoxWidth = Dimensions.MainBoxWidth;
  }

  tabClicked(tabId: string) {
    const tab = this.TabService.getMainBoxTabForID(tabId);
    if (tab) {
      this.TabService.setActiveTabForMainBox(tab);
    } else {
      console.error('Selected tab doesn\'t exist:', tabId);
    }
  }

  /**
   * Return a list of friends filtered by the search box
   * @return A list of users who's names meet the search text
   */
  getAllUsers(): IUser[] {
    return ArrayUtils.objectToArray(this.FriendsConnector.friends);
  }

  searchKeyword(): string {
    return this.Search.getQueryForActiveTab();
  }

  roomClicked(room: IRoom) {

    // Trim the messages array in case it gets too long
    // we only need to store the last 200 messages!
    room.trimMessageList();

    // Messages on is called by when we add the room to the user
    // If the room is already open do nothing!
    if (room.flashHeader()) {
      return;
    }

    room.open(0);
  }

  currentUser(): IUser {
    return this.UserStore.currentUser();
  }

  minimizeMainBox() {
    this.$rootScope.$broadcast(Defines.MinimizeMainBox);
  }

  showCreateRoomBox() {
    this.$rootScope.$broadcast(Defines.ShowCreateRoomBox);
  }

  showProfileSettingsBox() {
    this.$rootScope.$broadcast(Defines.ShowProfileSettingsBox);
  }

}

angular.module('myApp.components').component('mainBox', {
  templateUrl: '/assets/partials/main-box.html',
  controller: MainBoxController,
  controllerAs: 'ctrl',
});

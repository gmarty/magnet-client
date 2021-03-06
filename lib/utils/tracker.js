'use strict';

/**
 * Dependencies
 */

const ga = require('react-native-google-analytics-bridge').default;
const { AsyncStorage } = require('react-native');
const debug = require('../debug')('Tracker');
const config = require('../../config');

const analyticsTrackerId = config.analyticsTrackerId;
const env = global.__DEV__ ? 'development' : 'production';
const trackerId = analyticsTrackerId[env];

class Tracker {
  constructor() {
    this.enabled = true;
    this.storage = AsyncStorage;
    ga.setTrackerId(trackerId);
  }

  /**
   * By default Google Analytics is enabled.
   * Once we retrieve the stored user preferences
   * or when a user changes their telemetry
   * preferences we update this.
   *
   * Once a user is 'opted-out' any events
   * sent will be ignored.
   *
   * NOTE: Re-enabling may require an app
   * restart to become effective.
   *
   * @param {Boolean} value
   */
  enable(value) {
    if (this.enabled === value) return;
    debug('set enabled', value);
    ga.setOptOut(!value);
  }

  /**
   * Record a view/scene change.
   *
   * @param {String} name
   */
  view(name) {
    debug('view', name);
    ga.trackScreenView(name);
  }

  timing(category, name, start) {
    var ms = Date.now() - start;
    ga.trackTiming(category, ms, { name });
    debug('timing', category, name, ms);
  }

  event(category, name, payload) {
    ga.trackEvent(category, name, payload);
    debug('tracked event', category, name, payload);
  }

  /**
   * Tracks an event only once for the
   * app installation lifetime.
   *
   * @param  {String} category
   * @param  {String} action
   * @param  {String} [label]
   * @param  {Number} [value]
   * @return {Promise}
   */
  eventOnce(category, action, label, value) {
    const KEY = `${category}_${action}_${label}`;

    return this.storage.getItem(KEY)
      .then(v => {
        if (v) return Promise.resolve(true);
        return this.storage.setItem(KEY, 'true')
          .then(() => false);
      })

      .then(installed => {
        if (!installed) {
          debug('event once', category, action);
          ga.trackEvent(category, action, { label, value });
          return true;
        }

        return false;
      });
  }

  /**
   * Record app launch.
   *
   * We also call the `firstLaunch()` as this
   * will only ever be recorded once thanks
   * to the `.eventOnce()` helper.
   */
  appLaunch() {
    debug('app launch');
    this.event('system', 'app-process-launch');
    this.firstAppLaunch();
  }

  firstAppLaunch() {
    this.eventOnce('system', 'first-app-launch');
  }

  itemFound(originalUrl) {
    this.event('system', 'item-found', {
      label: `originalUrl:${originalUrl}`,
    });
  }

  itemPopulated(originalUrl, finalUrl) {
    this.event('system', 'item-populated', {
      label: `originalUrl:${originalUrl},finalUrl:${finalUrl}`,
    });
  }

  appInBackground() {
    debug('app-in-background');
    this.event('interaction', 'app-in-background');
  }

  appInForeground() {
    debug('app-in-foreground');
    this.event('interaction', 'app-in-foreground');
  }

  appLaunchFromNotification() {
    debug('app launch from notification');
    this.event('interaction', 'app-launch-from-notification');
  }

  notificationDismiss() {
    debug('notification dismiss');
    this.event('interaction', 'notification-dismiss');
  }

  tapListItem(url) {
    debug('tap:list-item');
    this.event('interaction', 'tap-list-item', {
      label: url,
      value: 1,
    });
  }

  pullRefresh() {
    debug('pull refresh');
    this.event('interaction', 'pull-refresh');
  }

  changeSetting(key, value) {
    debug('change setting', key, value);
    this.event('interaction', 'change-setting', {
      label: `key:${key},value:${value}`,
    });
  }
}

/**
 * Exports
 */

module.exports = new Tracker();

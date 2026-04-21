(() => {
  'use strict';

  const state = {
    tenant: null,
    tenantId: null,
    config: window.APP_CONFIG || null,
    initialized: false,
  };

  const subscribers = {};

  function emit(key, value) {
    (subscribers[key] || []).forEach(callback => {
      try {
        callback(value, getState());
      } catch (error) {
        console.error(`[AppStore] Error en subscriber "${key}":`, error);
      }
    });
  }

  function setState(partialState) {
    Object.keys(partialState || {}).forEach(key => {
      state[key] = partialState[key];
      emit(key, state[key]);
    });
    emit('*', getState());
    return getState();
  }

  function getState() {
    return { ...state };
  }

  function get(key) {
    return state[key];
  }

  function set(key, value) {
    if (typeof key === 'object' && key !== null) return setState(key);
    return setState({ [key]: value });
  }

  function subscribe(key, callback) {
    if (!subscribers[key]) subscribers[key] = [];
    subscribers[key].push(callback);

    if (key === '*') {
      callback(getState());
    } else {
      callback(state[key], getState());
    }

    return () => {
      subscribers[key] = (subscribers[key] || []).filter(fn => fn !== callback);
    };
  }

  window.AppStore = {
    setState,
    set,
    getState,
    get,
    subscribe,
  };

  window.App = window.App || {};
  window.App.store = window.AppStore;
})();

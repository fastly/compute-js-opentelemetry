/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

type Action = (...args: any[]) => void;
interface ActionDef {
  priority: number;
  fn: Action;
}
class ActionsManager {
  _actionsMap = new Map<string, ActionDef[]>();
  _dirtyKeys = new Set<string>();

  addAction(name: string, priority: number, fn: Action) {

    let actions = this._actionsMap.get(name);
    if(actions == null) {
      actions = [];
      this._actionsMap.set(name, actions);
    }
    actions.push({priority, fn});
    this._dirtyKeys.add(name);

  }

  sort() {
    for (const key of [...this._dirtyKeys]) {
      const actions = this._actionsMap.get(key);
      this._dirtyKeys.delete(key);
      if (actions == null) {
        continue;
      }
      actions.sort((a, b) => {
        return a.priority - b.priority;
      });
    }
  }

  doAction(name: string, ...args: any[]) {
    this.sort();

    let actions = this._actionsMap.get(name);
    if(actions == null) {
      return;
    }

    for (const actionDef of actions) {
      actionDef.fn(...args);
    }
  }
}

const actionsManager = new ActionsManager();

export function addAction(name: string, priority: number, fn: Action) {
  actionsManager.addAction(name, priority, fn);
}

export function doAction(name: string, ...args: any[]) {
  actionsManager.doAction(name, ...args);
}

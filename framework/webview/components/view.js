import { html, PolymerElement } from '@polymer/polymer/polymer-element'

class MyView extends PolymerElement {
  static get is() {
    return 'my-view'
  }

  static get template() {
    return html`
      <style>
        :host {
          display: block;
          white-space: normal;
        }
      </style>
      <slot></slot>
    `
  }
}

window.customElements.define(MyView.is, MyView)

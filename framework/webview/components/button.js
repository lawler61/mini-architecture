import { html, PolymerElement } from '@polymer/polymer/polymer-element'

const TAP = 'my-tap'
const TAP_UP = 'my-tapup'

class MyButton extends PolymerElement {
  static get is() {
    return 'my-button'
  }

  static get template() {
    return html`
      <style>
        :host {
          display: block;
          box-sizing: border-box;
          padding: 8px 12px;
          font-size: 18px;
          text-align: center;
          text-decoration: none;
          border-radius: 5px;
          border: 0.5px solid #d8d8d8;
          background-color: #fff;
          user-select: none;
        }

        :host([disabled]) {
          background-color: #d7dae0;
          color: #fff;
        }

        :host(.tap) {
          color: rgba(34, 34, 34, 0.6);
          border: 0.5px solid rgba(0, 0, 0, 0.1);
          background-color: transparent;
        }
      </style>
      <slot></slot>
    `
  }

  static get properties() {
    return {
      disabled: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
      },
      bindtap: Object,
    }
  }

  connectedCallback() {
    super.connectedCallback()
  }

  ready() {
    super.ready()

    this.hManager = new Hammer.Manager(this)
    this.hManager.add(new Hammer.Press({ event: TAP, time: 150 }))
    this.pan = new Hammer.Pan({ enable: false })
    this.hManager.add(this.pan)

    // events
    this.hManager.on(TAP, this._onTap.bind(this))
    this.hManager.on(TAP_UP, this._onTapped.bind(this))
    // 移动后再放开
    this.hManager.on('panend pancancel', this._onTapped.bind(this))
  }

  _onTap(ev) {
    if (this.disabled) return

    this.classList.add('tap')
    this.pan.set({ enable: true })
  }

  _onTapped(ev) {
    if (!this.classList.contains('tap')) return

    const { type, target, timeStamp, center = {}, srcEvent = {} } = ev
    const event = {
      type: type,
      detail: center,
      target: target,
      timeStamp: timeStamp,
      preventDefault: () => ev.preventDefault(),
      stopPropagation: () => ev.stopPropagation(),
    }
    let shouldTrigger = false

    if (typeof this.bindtap === 'function') {
      if (type === TAP_UP) {
        shouldTrigger = true
      } else if (Array.isArray(srcEvent.path) && srcEvent.path.some((el) => el === this)) {
        // panend
        shouldTrigger = true
      }
    }

    // console.log('_onTapped', shouldTrigger, ev.type)
    shouldTrigger && this.bindtap(event)

    this.pan.set({ enable: false })
    this.classList.remove('tap')
  }
}

window.customElements.define(MyButton.is, MyButton)

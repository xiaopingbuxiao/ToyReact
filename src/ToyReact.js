

class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type)
  }
  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {    // 增加事件
      const eventType = RegExp.$1.toLowerCase()
      this.root.addEventListener(eventType, value)
      return  // 避免将 onClick 之类的也在dom中显示
    }
    if (name === 'className') { // class 的处理
      name = 'class'
    }
    this.root.setAttribute(name, value)
  }
  appendChild(vChild) {
    let range = document.createRange()
    if (this.root.children.length) {
      range.setStartAfter(this.root.lastChild)
      range.setEndAfter(this.root.lastChild)
    } else {
      range.setStart(this.root, 0)
      range.setEnd(this.root, 0)
    }
    vChild.mountTo(range)
  }
  mountTo(range) {
    range.deleteContents()
    range.insertNode(this.root)
    // parent.appendChild(this.root)
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content)
  }
  mountTo(range) {
    range.deleteContents()
    range.insertNode(this.root)
  }
}


export class Component {
  constructor() {
    this.children = []
    this.props = Object.create(null)
  }
  setAttribute(name, value) {
    this.props[name] = value
    this[name] = value
  }
  mountTo(range) {
    this.range = range
    this.update()
  }
  update() {

    let placeholder = document.createComment('placeholder') // 此处是为了避免range的变化
    let range = document.createRange()
    range.setStart(this.range.endContainer, this.range.endOffset)
    range.setEnd(this.range.endContainer, this.range.endOffset)
    range.insertNode(placeholder)

    this.range.deleteContents()
    let vdom = this.render()
    vdom.mountTo(this.range)
  }
  appendChild(child) { // 组建的children 就是放在这个数组中
    this.children.push(child)
  }
  setState(state) {
    let merge = (oldState, newState) => {
      for (let p in newState) {
        if (typeof newState[p] === 'object' && newState[p] !== null) {
          if (typeof oldState[p] !== 'object') {
            if (Array.isArray(newState[p])) {
              oldState[p] = []
            } else {
              oldState[p] = {}
            }
          }
          merge(oldState[p], newState[p])
        } else {
          oldState[p] = newState[p]
        }
      }
    }
    if (!this.state && state) {
      this.state = {}
    }
    merge(this.state, state)
    console.log(this.state, 'setstate执行')
    this.update()
  }
}



export class ToyReact {
  static createElement(type, attributes, ...children) {
    let element;
    if (typeof type === 'string') {
      element = new ElementWrapper(type)
    } else {
      element = new type
    }
    for (let name in attributes) {
      element.setAttribute(name, attributes[name])
    }
    // for (let child of children) {
    //   child = typeof child === 'string' ? new TextWrapper(child) : child
    //   element.appendChild(child)
    // }

    let insertChildren = (children) => {
      for (let child of children) {
        // if (typeof child === 'string') {
        //   child = new TextWrapper(child)
        // }
        if (Array.isArray(child)) {
          insertChildren(child)
        } else {
          if (typeof child === 'object') {
            if (child === null || child === void 0) {
              child = ''
            }
            if (!(child instanceof Component) && !(child instanceof TextWrapper) && !(child instanceof ElementWrapper)) {
              child = String(child) // 如果是 true 变成字符串
            }
          }
          if (typeof child === 'string') {
            child = new TextWrapper(child)
          }
          element.appendChild(child)
        }
      }
    }
    insertChildren(children)
    return element
  }
  static render(vdom, element) {
    console.log(element, 1111)

    let range = document.createRange()
    if (element.children.length) {
      range.setStartAfter(element.lastChild)
      range.setEndAfter(element.lastChild)
    } else {
      range.setStart(element, 0)
      range.setEnd(element, 0)
    }
    vdom.mountTo(range)
    // element.appendChild(vdom)
  }
}
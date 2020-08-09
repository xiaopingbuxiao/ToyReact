let childrenSymbol = Symbol('children');
class ElementWrapper {
  constructor(type) {
    this.type = type;
    this.props = Object.create(null);
    this[childrenSymbol] = [];
    this.children = [];
  }
  setAttribute(name, value) {
    // \s\S 表示所有字符的意思 、\s表示空白， \S表示非空白，合在一起就是所有字符的意思
    // if (name.match(/^on([\s\S]+)$/)) {
    //     // console.log(RegExp.$1);
    //     let eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
    //     this.root.addEventListener(eventName, value);
    // }
    // if (name === 'className')
    //     name = 'class';
    // this.root.setAttribute(name, value);
    this.props[name] = value;
  }

  appendChild(vchild) { // 虚拟的child
    this[childrenSymbol].push(vchild);
    this.children.push(vchild.vdom);
    // let range = document.createRange();
    // if (this.root.children.length) {
    //     range.setStartAfter(this.root.lastChild);
    //     range.setEndAfter(this.root.lastChild);
    // } else {
    //     range.setStart(this.root, 0);
    //     range.setEnd(this.root, 0);
    // }
    // vchild.mountTo(range);
  }

  get vdom() {
    return this;
  }

  mountTo(range) {
    this.range = range;
    let placeholder = document.createComment('placeholder');
    let endRange = document.createRange();
    endRange.setStart(range.endContainer, range.endOffset);
    endRange.setEnd(range.endContainer, range.endOffset);
    endRange.insertNode(placeholder);

    range.deleteContents();
    let element = document.createElement(this.type);

    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        // console.log(RegExp.$1);
        let eventName = RegExp.$1.replace(/^[\s\S]/, (s) => s.toLowerCase());
        element.addEventListener(eventName, value);
      }
      if (name === 'className')
        name = 'class';
      element.setAttribute(name, value);
    }

    for (let child of this.children) {
      let range = document.createRange();
      if (element.children.length) {
        range.setStartAfter(element.lastChild);
        range.setEndAfter(element.lastChild);
      } else {
        range.setStart(element, 0);
        range.setEnd(element, 0);
      }
      child.mountTo(range);
    }
    range.insertNode(element);
  }
}

class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content);
    this.type = "#text";
    this.children = [];
    this.props = Object.create(null);

  }
  mountTo(range) {
    this.range = range;
    range.deleteContents();
    range.insertNode(this.root);
  }
  get vdom() {
    return this;
  }
}

export class Component {
  constructor() {
    this.children = [];
    this.props = Object.create(null); // 获得一个纯净的Object对象，不带有Object自带的一些默认方法，比如toString()等等
  }
  get type() {
    return this.constructor.name;
  }
  setAttribute(name, value) {
    if (name.match(/^on([\s\S]+)$/)) {
      console.log(RegExp.$1);
    }
    this.props[name] = value;
    this[name] = value;
  }
  mountTo(range) {
    this.range = range; // 将range 存起来
    this.update();
  }
  update() {

    let vdom = this.vdom; // 然后重新渲染
    if (this.oldVdom) {
      let isSameNode = (node1, node2) => {
        if (node1.type !== node2.type)
          return false;
        for (let name in node1.props) {
          if (typeof node1.props[name] !== 'function' && typeof node2.props[name] !== 'function'
            && node1.props[name].toString() !== node2.props[name].toString())
            continue;
          if (typeof node1.props[name] !== 'object' && typeof node2.props[name] !== 'object'
            && JSON.stringify(node1.props[name]) !== JSON.stringify(node2.props[name]))
            continue;
          if (node1.props[name] !== node2.props[name])
            return false;
        }
        if (Object.keys(node1.props).length !== Object.keys(node2.props).length)
          return false;
        return true;
      };

      let isSameTree = (node1, node2) => {
        if (!isSameNode(node1, node2))
          return false;
        if (node1.children.length !== node2.children.length)
          return false;

        for (let i = 0; i < node1.children.length; i++) {
          if (!isSameTree(node1.children[i], node2.children[i]))
            return false;
        }
        return true;
      };

      let replace = (newTree, oldTree) => {
        if (isSameTree(newTree, oldTree))
          return;
        // 如果根节点不相同
        if (!isSameNode(newTree, oldTree)) {
          newTree.mountTo(oldTree.range); // 进行mountTo
        } else {
          for (let i = 0; i < newTree.children.length; i++) {
            replace(newTree.children[i], oldTree.children[i]);
          }
        }
      };

      // console.log("old:", vdom);
      // console.log("new:", this.vdom);

      replace(vdom, this.oldVdom);

    } else {
      vdom.mountTo(this.range); // 进行mountTo
    }
    this.oldVdom = vdom;

    // placeholder.parentNode.removeChild(placeholder); // 用placeholder的方式，标记位置，防止滑上去
  }

  get vdom() {
    return this.render().vdom;
  }

  appendChild(vchild) {
    this.children.push(vchild);
  }
  setState(state) {
    let merge = (oldState, newState) => {
      for (let p in newState) { // in 对对象循环着属性
        if (typeof newState[p] === 'object' && newState[p] !== null) {
          if (typeof oldState[p] !== 'object') {
            if (newState[p] instanceof Array)
              oldState[p] = [];
            else
              oldState[p] = {};
          }
          merge(oldState[p], newState[p]);
        } else { // 其他情况直接赋值，覆盖之前的值
          oldState[p] = newState[p];
        }
      }
    }
    if (!state && state) this.state = {};
    merge(this.state, state);
    // console.log(this.state);
    this.update(); // 能拿到赋的值，说明可以进行更新了
  }
}

export let ToyReact = {
  createElement(type, attributes, ...children) {
    console.log(arguments);
    let element;
    if (typeof type === 'string')
      element = new ElementWrapper(type);
    else
      element = new type;
    for (let name in attributes) {
      // element[name] = attributes[name];  // 不能这样写
      element.setAttribute(name, attributes[name]);
    }
    let insertChildren = (children) => {
      for (let child of children) { // of 直接得到值，不能对着对象使用

        if (typeof child === 'object' && child instanceof Array) {
          insertChildren(child);
        } else {
          if (child === null || child === void 0) child = '';
          if (!(child instanceof Component)
            && !(child instanceof ElementWrapper)
            && !(child instanceof TextWrapper))
            child = String(child);
          if (typeof child === 'string')
            child = new TextWrapper(child);
          element.appendChild(child);
        }
      }
    }
    insertChildren(children);
    return element;
  },
  render(vdom, element) {
    let range = document.createRange();
    if (element.children.length) {
      range.setStartAfter(element.lastChild);
      range.setEndAfter(element.lastChild);
    } else {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    }
    vdom.mountTo(range)
  }
}
import { createRenderer } from '@vue/runtime-core'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const catalogue = {}
export const extend = (objects) => void Object.assign(catalogue, objects)

const { render, createApp } = createRenderer({
  createElement(type, isSVG, isCustomizedBuiltIn, props) {
    const instance =
      props?.object ?? new THREE[type[0].toUpperCase() + type.slice(1)](...JSON.parse(props?.args ?? '[]'))

    instance.foo = {}

    if (props && props.attach === undefined) {
      if (instance.isMaterial) instance.attach = 'material'
      else if (instance.isBufferGeometry) instance.attach = 'geometry'
    }

    return instance
  },
  insert(child, parent, beforeChild) {
    if (parent.isObject3D && child.isObject3D) {
      const index = beforeChild ? parent.children.indexOf(beforeChild) : 0
      child.parent = parent
      parent.children.splice(index, 0, child)
      child.dispatchEvent({ type: 'added' })
    } else if (typeof child.attach === 'string') {
      child.__previousAttach = child[parent.attach]
      parent[child.attach] = child
      node.parent = parent
    }
  },
  remove(node) {
    const parent = node.parent
    if (parent) {
      if (parent.isObject3D && node.isObject3D) {
        parent.remove(node)
      } else if (typeof child.attach === 'string') {
        parent[child.attach] = child.__previousAttach
        delete child.__previousAttach
        node.parent = null
      }
    }

    node.dispose?.()
    node.traverse?.((node) => node.dispose?.())
  },
  patchProp(node, prop, prevValue, nextValue) {
    let root = node
    let key = prop
    let target = root[key]

    // Traverse pierced props (e.g. foo-bar=value => foo.bar = value)
    if (key.includes('-')) {
      const chain = key.split('-')
      target = chain.reduce((acc, key) => acc[key], root)
      key = chain.pop()

      if (!target?.set) root = chain.reduce((acc, key) => acc[key], root)
    }

    let value = nextValue
    try {
      const num = parseFloat(value)
      value = isNaN(num) ? JSON.parse(value) : num
    } catch (_) {}

    // Set prop, prefer atomic methods if applicable
    if (!target?.set) root[key] = value
    else if (target.constructor === value.constructor) target.copy(value)
    else if (Array.isArray(value)) target.set(...value)
    else if (!target.isColor && target.setScalar) target.setScalar(value)
    else target.set(value)
  },
  createText(text) {},
  createComment(text) {},
  setText(node, text) {},
  setElementText(node, text) {},
  parentNode(node) {
    return node.parent
  },
  nextSibling(node) {
    if (node.parent?.children) {
      const index = node.parent.children.indexOf(node)
      if (index !== -1) return node.parent.children[index + 1]
    }
    return null
  },
})

THREE.ColorManagement.enabled = true

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
})
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight)
camera.position.set(0, 1.3, 3)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const scene = new THREE.Scene()

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})

extend(THREE)
createApp((await import('./App.vue')).default).mount(scene)

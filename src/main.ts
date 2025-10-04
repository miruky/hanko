import './style.css';
import { createApp } from './app';
import { createStore, defaultSeal } from './lib/seal';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

const store = createStore(localStorage);

// 一度でも保存があればその状態から、なければ見本の印影から始める
const initialSeal = store.load() ?? defaultSeal();
store.save(initialSeal);

createApp({ root, store, initialSeal });

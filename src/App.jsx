import { useEffect, useState } from 'react'

const endpoint = 'https://fakestoreapi.com/products'
const samples = [
  { id: 1, title: 'Рюкзак', category: "men's clothing", price: 59.95, description: 'Учебный товар для проверки фильтров.' },
  { id: 2, title: 'Серебряное кольцо', category: 'jewelery', price: 99, description: 'Учебный товар для проверки фильтров.' },
  { id: 3, title: 'Монитор', category: 'electronics', price: 249, description: 'Учебный товар для проверки фильтров.' },
  { id: 4, title: 'Жакет', category: "women's clothing", price: 39.99, description: 'Учебный товар для проверки фильтров.' },
]
const initial = { categories: [], min: '', max: '' }

function ProductCard({ product }) {
  const [broken, setBroken] = useState(false)
  return <article className="card">
    {product.image && !broken ? <img src={product.image} alt={product.title} onError={() => setBroken(true)} /> :
      <div className="poster">Нет изображения</div>}
    <small>{product.category}</small><h2>{product.title}</h2>
    <p><strong>{product.price.toFixed(2)} USD</strong></p><p>{product.description}</p>
  </article>
}

function Filters({ categories, ceiling, onApply }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  function update(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }))
    setErrors(previous => ({ ...previous, [key]: '', ...(key === 'min' ? { max: previous.maxOrder ? '' : previous.max } : {}), maxOrder: false }))
  }
  function apply(event) {
    event.preventDefault()
    const next = {}
    for (const key of ['min', 'max']) {
      if (draft[key] === '') continue
      if (!Number.isFinite(Number(draft[key]))) next[key] = 'Введите число'
      else if (Number(draft[key]) < 0) next[key] = 'Цена не может быть отрицательной'
    }
    if (!next.min && !next.max && draft.min !== '' && draft.max !== '' && Number(draft.min) > Number(draft.max)) {
      next.max = 'Максимум должен быть не меньше минимума'
      next.maxOrder = true
    }
    setErrors(next)
    if (!Object.keys(next).length) onApply(draft)
  }
  return <form className="panel stack" noValidate onSubmit={apply}>
    <fieldset><legend>Категории</legend>{categories.map(category =>
      <label key={category}><input type="checkbox" checked={draft.categories.includes(category)}
        onChange={e => update('categories', e.target.checked ? [...draft.categories, category] :
          draft.categories.filter(item => item !== category))} /> {category}</label>
    )}</fieldset>
    {['min', 'max'].map((key, i) => <div key={key}>
      <label>Цена {i ? 'до' : 'от'}, USD
        <input type="number" step="any" value={draft[key]} aria-invalid={Boolean(errors[key])} onChange={e => update(key, e.target.value)} />
      </label>
      <input aria-label={i ? 'Ползунок максимальной цены' : 'Ползунок минимальной цены'}
        type="range" min="0" max={ceiling} value={draft[key] || (i ? ceiling : 0)} onChange={e => update(key, e.target.value)} />
      {errors[key] && <small className="error">{errors[key]}</small>}
    </div>)}
    <div className="row"><button>Применить фильтры</button><button type="button" onClick={() => {
      setDraft(initial); setErrors({}); onApply(initial)
    }}>Сбросить</button></div>
  </form>
}

function ProductList() {
  const [demo, setDemo] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', products: [] })
  const [filters, setFilters] = useState(initial)
  useEffect(() => {
    if (demo) return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort('timeout'), 10000)
    async function load() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const products = await response.json()
        if (!Array.isArray(products)) throw new Error('Неожиданный ответ API')
        if (!controller.signal.aborted) setState({ status: 'ready', products })
      } catch (error) {
        if (controller.signal.reason === 'timeout') setState({ status: 'error', message: 'Время ожидания истекло' })
        else if (!controller.signal.aborted) setState({ status: 'error', message: error.message })
      } finally {
        clearTimeout(timer)
      }
    }
    load()
    return () => { clearTimeout(timer); controller.abort() }
  }, [demo, attempt])
  const products = demo ? samples : state.products ?? []
  const categories = [...new Set(products.map(product => product.category))]
  const filtered = products.filter(product =>
    (!filters.categories.length || filters.categories.includes(product.category)) &&
    (filters.min === '' || product.price >= Number(filters.min)) &&
    (filters.max === '' || product.price <= Number(filters.max))
  )
  function reload() {
    setState({ status: 'loading', products: [] })
    setAttempt(value => value + 1)
  }
  return <section className="stack">
    <label><input type="checkbox" checked={demo} onChange={event => {
      setFilters(initial); setDemo(event.target.checked)
      if (!event.target.checked) reload()
    }} /> Использовать демонстрационные товары</label>
    {!demo && state.status === 'loading' && <p role="status">Загрузка товаров…</p>}
    {!demo && state.status === 'error' && <div role="alert" className="error">Ошибка: {state.message} <button onClick={reload}>Повторить</button></div>}
    {(demo || state.status === 'ready') && <>
      <Filters key={String(demo)} categories={categories} ceiling={Math.max(1, ...products.map(p => Math.ceil(p.price)))} onApply={setFilters} />
      <p role="status">{filtered.length ? 'Найдено товаров: ' + filtered.length : 'Товары не найдены'}</p>
      <div className="grid">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div>
    </>}
  </section>
}

export default function App() {
  return <main><h1>Каталог товаров</h1><ProductList /></main>
}

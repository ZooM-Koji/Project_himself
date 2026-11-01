import Empty from '../components/Empty'
import { IconTasks } from '../components/Icons'
import PageHead from '../components/PageHead'

const FILTERS = ['Все', 'На этой неделе', 'Просрочено', 'Сдано']

export default function Tasks() {
  return (
    <>
      <PageHead title="Задания" />
      <div className="chips">
        {FILTERS.map((f, i) => (
          <span key={f} className={i === 0 ? 'pill active' : 'pill'}>
            {f}
          </span>
        ))}
      </div>
      <Empty
        icon={<IconTasks />}
        title="Заданий пока нет"
        text="Практические, лабораторные, конспекты с дедлайнами и статусами появятся на этапе 1.5."
      />
    </>
  )
}

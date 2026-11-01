import Empty from '../components/Empty'
import { IconStar } from '../components/Icons'
import PageHead from '../components/PageHead'

export default function Activities() {
  return (
    <>
      <PageHead title="Активности" />
      <Empty
        icon={<IconStar />}
        title="Проектов пока нет"
        text="Студсовет, «Школа актива», репетиции и выступления — с задачами и датами на этапе 3."
      />
    </>
  )
}

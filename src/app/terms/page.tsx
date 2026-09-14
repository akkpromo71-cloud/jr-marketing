import { Nav } from '@/components/nav';
import { BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

// Публичная страница условий использования — доступна без входа в аккаунт,
// на неё ссылаются чекбоксы согласия при регистрации и при создании
// кампании (см. src/app/(auth)/signup/*/page.tsx и src/app/dashboard/new/page.tsx).
//
// Текст ниже — стартовая, максимально понятная версия условий для MVP-этапа
// клиппинг-платформы, а не юридически выверенный документ конкретной
// юрисдикции. Прежде чем полагаться на неё как на полноценную защиту
// бизнеса, стоит показать её юристу — особенно разделы про права на
// контент и ответственность.
const content = {
  ru: {
    title: 'Условия использования',
    updated: 'Действует с 15 сентября 2026 года.',
    sections: [
      {
        title: '1. Что такое J/R',
        body: [
          'J/R — клиппинг-платформа для TikTok, Reels и Shorts. Заказчик размещает кампанию и платит за доставленные просмотры; клиппер берёт слот в кампании, монтирует и публикует ролик у себя на аккаунте и получает оплату с каждого ролика по ставке кампании за 1000 просмотров.',
        ],
      },
      {
        title: '2. Бюджет и резерв слота',
        body: [
          'Заказчик пополняет бюджет кампании заявкой на пополнение — зачисление подтверждает администратор вручную. Когда клиппер берёт слот, сумма (потолок выплаты за ролик) резервируется из бюджета кампании и держится до дедлайна слота (по умолчанию 72 часа). Если клиппер не успел сдать работу — резерв возвращается в бюджет. Реальные платежи (приём денег от заказчика, перевод клипперу) на этом этапе не автоматизированы: пополнение и вывод подтверждает администратор вручную, площадка не выступает платёжным агентом.',
        ],
      },
      {
        title: '3. Начисления и подсчёт просмотров',
        body: [
          'Просмотры по опубликованным роликам пересчитываются автоматически не реже раза в сутки; начисление считается по приросту просмотров с предыдущего снимка, а не по общей сумме. Официального API для получения статистики чужих постов не существует ни у одной площадки (TikTok, Reels, Shorts) — сбор данных может быть нестабильным; когда автоматический сбор не срабатывает, администратор вносит просмотры вручную. Выплата за один ролик ограничена потолком, указанным в кампании.',
        ],
      },
      {
        title: '4. Модерация и отказ',
        body: [
          'Каждая сданная работа проходит модерацию администратора. Отклонить работу без указания причины технически невозможно — причина обязательна и видна клипперу. Аномальный прирост просмотров (подозрение на накрутку) удерживается от начисления до ручной проверки и не учитывается в отчёте заказчика, пока не подтверждён администратором.',
        ],
      },
      {
        title: '5. Вывод средств',
        body: [
          'Минимальной суммы вывода нет. Заявка на вывод рассматривается администратором вручную, ориентир — в течение 24 часов с момента подачи. Аккаунт клиппера проходит модерацию администратора до того, как по нему можно взять первую работу.',
        ],
      },
      {
        title: '6. Оценка бюджета и результатов',
        body: [
          'Ставка и потолок выплаты за ролик, которые заказчик указывает при создании кампании, не гарантируют конкретное число просмотров или иной результат продвижения — реальные цифры зависят от контента, площадки публикации и множества факторов вне контроля платформы.',
        ],
      },
      {
        title: '7. Права на контент',
        body: [
          'Размещая кампанию, заказчик подтверждает, что обладает правами на переданные материалы (трек, клип, стрим) или необходимыми разрешениями для их использования в роликах клипперов. Публикуя ролик на свой аккаунт, клиппер подтверждает, что использованные материалы не нарушают права третьих лиц. Площадка не несёт ответственности за нарушения авторских прав, допущенные пользователями при публикации контента.',
        ],
      },
      {
        title: '8. Правила поведения',
        body: [
          'Запрещены: накрутка просмотров/лайков ботами, сдача одной и той же ссылки на пост в нескольких работах, договорённости в обход площадки после того, как знакомство состоялось через неё, предоставление заведомо ложных данных о себе, оскорбительное поведение по отношению к другим участникам или команде.',
        ],
      },
      {
        title: '9. Публичная информация',
        body: [
          'Список открытых кампаний (ставка, остаток бюджета, свободные слоты, площадки) виден без регистрации. Публичный профиль клиппера показывает средние просмотры на ролик, долю принятых работ, среднюю скорость сдачи и число выполненных заданий; сумму заработка клиппер может скрыть в настройках, остальные показатели скрыть нельзя.',
        ],
      },
      {
        title: '10. Ответственность',
        body: [
          'Площадка предоставляется «как есть». Мы стараемся обеспечить достоверность статистики и своевременность модерации и выплат, но не гарантируем бесперебойную работу сервиса и не несём ответственности за косвенные убытки, возникшие в результате использования площадки.',
        ],
      },
      {
        title: '11. Изменения условий',
        body: [
          'Мы можем обновлять эти условия — актуальная версия всегда доступна на этой странице. Продолжая пользоваться площадкой после обновления, вы соглашаетесь с новой версией.',
        ],
      },
      {
        title: '12. Контакты',
        body: ['По любым вопросам — через Telegram-канал площадки, указанный на главной странице.'],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    updated: 'Effective September 15, 2026.',
    sections: [
      {
        title: '1. What J/R is',
        body: [
          'J/R is a clipping platform for TikTok, Reels, and Shorts. A client posts a campaign and pays for delivered views; a clipper takes a slot in the campaign, edits and posts a clip to their own account, and gets paid from every clip at the campaign\'s rate per 1,000 views.',
        ],
      },
      {
        title: '2. Budget and slot reservation',
        body: [
          "A client funds a campaign's budget with a deposit request, confirmed manually by the admin. When a clipper takes a slot, an amount (the campaign's per-clip cap) is reserved from the budget and held until the slot's deadline (72 hours by default). If the clipper doesn't submit in time, the reserve returns to the budget. Actual payments (receiving money from the client, transferring money to a clipper) are not automated at this stage: deposits and withdrawals are confirmed by the admin manually, and the platform does not act as a payment processor.",
        ],
      },
      {
        title: '3. Payouts and view counting',
        body: [
          "Views on published clips are recalculated automatically at least once a day; payouts are computed from the increase in views since the previous snapshot, not the running total. No platform (TikTok, Reels, Shorts) offers an official API for another account's post statistics, so automatic collection can be unreliable — when it fails, the admin enters views manually. Payout per clip is capped at the amount set on the campaign.",
        ],
      },
      {
        title: '4. Moderation and rejection',
        body: [
          "Every submitted clip goes through admin review. Rejecting work without stating a reason isn't a code path that exists — a reason is required and shown to the clipper. Unusual view growth (suspected manipulation) is held from payout pending manual review and excluded from the client's report until confirmed by the admin.",
        ],
      },
      {
        title: '5. Withdrawals',
        body: [
          "There's no minimum withdrawal amount. A withdrawal request is reviewed by the admin manually, targeted within 24 hours of submission. A clipper's account goes through admin review before they can take their first job.",
        ],
      },
      {
        title: '6. Budget and outcome estimates',
        body: [
          "The rate and per-clip cap a client sets when creating a campaign do not guarantee any specific view count or other promotional outcome — actual numbers depend on the content, the publishing platform, and many factors outside the platform's control.",
        ],
      },
      {
        title: '7. Content rights',
        body: [
          'By posting a campaign, the client confirms they hold the rights (or the necessary permissions) to the materials provided (track, clip, stream) for use in clippers\' videos. By posting a clip to their own account, the clipper confirms the materials used do not infringe third-party rights. The platform is not responsible for copyright infringement committed by users when they publish content.',
        ],
      },
      {
        title: '8. Conduct',
        body: [
          'Prohibited: inflating views/likes with bots, submitting the same post link across multiple jobs, arranging deals outside the platform after meeting through it, providing knowingly false information about yourself, and abusive behavior toward other participants or our team.',
        ],
      },
      {
        title: '9. Public information',
        body: [
          "The list of open campaigns (rate, budget left, free slots, platforms) is visible without signing up. A clipper's public profile shows average views per clip, share of accepted work, average time to submit, and jobs completed; a clipper may hide their total earnings in settings, but not the other metrics.",
        ],
      },
      {
        title: '10. Liability',
        body: [
          'The platform is provided "as is." We aim to keep stats accurate and moderation and payouts timely, but we don\'t guarantee uninterrupted service and are not liable for indirect losses arising from use of the platform.',
        ],
      },
      {
        title: '11. Changes to these terms',
        body: [
          'We may update these terms from time to time — the current version is always available on this page. Continuing to use the platform after an update means you accept the new version.',
        ],
      },
      {
        title: '12. Contact',
        body: ['For any questions, reach us through the Telegram channel linked on the homepage.'],
      },
    ],
  },
};

export default async function TermsPage() {
  const { locale, t } = await getDict();
  const c = content[locale];

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-container-text px-6 py-12">
        <BackLink href="/" label={t.common.back} />
        <h1 className="text-headline text-text">{c.title}</h1>
        <p className="mt-2 text-meta text-text-faint">{c.updated}</p>

        <div className="mt-10">
          {c.sections.map((section) => {
            // Номер раздела свисает в левое поле (редакторский приём).
            const [num, ...rest] = section.title.split(' ');
            return (
              <section
                key={section.title}
                className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-border py-8"
              >
                <span className="text-meta tabular text-text-faint">{num}</span>
                <div>
                  <h2 className="text-title text-text">{rest.join(' ')}</h2>
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="mt-3 text-body text-text-dim">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

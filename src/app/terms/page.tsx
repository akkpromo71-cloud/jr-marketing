import { Nav } from '@/components/nav';
import { Card, BackLink } from '@/components/ui';
import { getDict } from '@/lib/i18n';

// Публичная страница условий использования — доступна без входа в аккаунт,
// на неё ссылаются чекбоксы согласия при регистрации и при создании
// кампании (см. src/app/(auth)/signup/*/page.tsx и src/app/dashboard/new/page.tsx).
//
// Текст ниже — стартовая, максимально понятная версия условий для MVP-этапа
// площадки, а не юридически выверенный документ конкретной юрисдикции.
// Прежде чем полагаться на неё как на полноценную защиту бизнеса, стоит
// показать её юристу — особенно разделы про права на контент и ответственность.
const content = {
  ru: {
    title: 'Условия использования',
    updated: 'Действует с 5 сентября 2026 года.',
    sections: [
      {
        title: '1. Что такое J/R marketing',
        body: [
          'J/R marketing — площадка, которая соединяет артистов, продвигающих треки в TikTok и Reels, с видеоэдиторами, которые делают монтаж под эти треки. Мы подбираем эдитора под бюджет и бриф артиста, следим за сроками и правками, и показываем итоговую статистику (просмотры, лайки) по опубликованным эдитам.',
        ],
      },
      {
        title: '2. Оплата',
        body: [
          'Все расчёты между площадкой и эдитором проходят вручную, напрямую на способ оплаты, указанный эдитором в профиле — PayPal или криптокошелёк. Площадка не хранит и не удерживает деньги пользователей в каком-либо балансе или эскроу — оплата отправляется командой J/R marketing после того, как работа принята.',
          'Артист передаёт бюджет и бриф команде — распределение бюджета между эдиторами и его администрирование ведёт команда J/R marketing.',
        ],
      },
      {
        title: '3. Оценка бюджета и результатов',
        body: [
          'Рекомендованный бюджет, который площадка показывает при создании кампании, — это ориентировочный расчёт на основе средних ставок наших эдиторов на момент публикации трека. Это не гарантия конкретного охвата, числа просмотров или иного результата продвижения — реальные цифры зависят от контента, платформы (TikTok/Reels) и множества факторов вне нашего контроля.',
        ],
      },
      {
        title: '4. Права на контент',
        body: [
          'Публикуя трек, артист подтверждает, что обладает правами на него (или необходимыми разрешениями) для использования в промо-эдитах на TikTok/Reels. Публикуя готовый эдит на свой аккаунт, эдитор подтверждает, что использованные материалы не нарушают права третьих лиц. Площадка не несёт ответственности за нарушения авторских прав, допущенные пользователями при публикации контента.',
        ],
      },
      {
        title: '5. Правила поведения',
        body: [
          'Запрещены: накрутка просмотров/лайков ботами, договорённости в обход площадки после того, как знакомство состоялось через неё, предоставление заведомо ложных данных о себе (включая цену, соцсети, число подписчиков), оскорбительное поведение по отношению к другим участникам или команде.',
        ],
      },
      {
        title: '6. Модерация',
        body: [
          'Регистрация эдитора и каждая заявка на кампанию проходят модерацию администратора. Площадка вправе отклонить заявку, заблокировать аккаунт или отменить кампанию при нарушении этих условий.',
        ],
      },
      {
        title: '7. Ответственность',
        body: [
          'Площадка предоставляется «как есть». Мы стараемся обеспечить достоверность статистики (просмотры/лайки подтягиваются автоматически с TikTok) и своевременность модерации, но не гарантируем бесперебойную работу сервиса и не несём ответственности за косвенные убытки, возникшие в результате использования площадки.',
        ],
      },
      {
        title: '8. Изменения условий',
        body: [
          'Мы можем обновлять эти условия — актуальная версия всегда доступна на этой странице. Продолжая пользоваться площадкой после обновления, вы соглашаетесь с новой версией.',
        ],
      },
      {
        title: '9. Контакты',
        body: ['По любым вопросам — через Telegram-канал площадки, указанный на главной странице.'],
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    updated: 'Effective September 5, 2026.',
    sections: [
      {
        title: '1. What J/R marketing is',
        body: [
          'J/R marketing is a platform that connects artists promoting tracks on TikTok and Reels with video editors who create edits for those tracks. We match an editor to the budget and brief an artist provides, track deadlines and revisions, and surface the resulting stats (views, likes) for published edits.',
        ],
      },
      {
        title: '2. Payment',
        body: [
          'All payouts between the platform and an editor are handled manually, sent directly to the payout method the editor listed on their profile — PayPal or a crypto wallet. The platform does not hold or custody user funds in any balance or escrow — payment is sent by the J/R marketing team once the work is accepted.',
          'The artist hands the budget and the brief to our team — allocating the budget across editors and administering it is handled by the J/R marketing team.',
        ],
      },
      {
        title: '3. Budget estimates and results',
        body: [
          'The recommended budget shown when creating a campaign is an approximate estimate based on our editors’ average rates at the time the track is posted. It is not a guarantee of any specific reach, view count, or other promotional outcome — actual numbers depend on the content, the platform (TikTok/Reels), and many factors outside our control.',
        ],
      },
      {
        title: '4. Content rights',
        body: [
          'By posting a track, the artist confirms they hold the rights (or the necessary permissions) to use it in promotional edits on TikTok/Reels. By posting a finished edit to their own account, the editor confirms the materials used do not infringe third-party rights. The platform is not responsible for copyright infringement committed by users when they publish content.',
        ],
      },
      {
        title: '5. Conduct',
        body: [
          'Prohibited: inflating views/likes with bots, arranging deals outside the platform after meeting through it, providing knowingly false information about yourself (including price, social accounts, or follower counts), and abusive behavior toward other participants or our team.',
        ],
      },
      {
        title: '6. Moderation',
        body: [
          'Editor sign-up and every campaign application go through admin review. The platform may reject an application, suspend an account, or cancel a campaign for violating these terms.',
        ],
      },
      {
        title: '7. Liability',
        body: [
          "The platform is provided \"as is.\" We aim to keep stats accurate (views/likes are pulled automatically from TikTok) and moderation timely, but we don't guarantee uninterrupted service and are not liable for indirect losses arising from use of the platform.",
        ],
      },
      {
        title: '8. Changes to these terms',
        body: [
          'We may update these terms from time to time — the current version is always available on this page. Continuing to use the platform after an update means you accept the new version.',
        ],
      },
      {
        title: '9. Contact',
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
      <main className="mx-auto max-w-2xl px-6 py-12">
        <BackLink href="/" label={t.common.back} />
        <h1 className="font-display text-3xl font-medium text-text">{c.title}</h1>
        <p className="mt-1 text-sm text-text-faint">{c.updated}</p>

        <Card className="mt-8 flex flex-col gap-8 p-6 sm:p-8">
          {c.sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-lg font-medium text-text">{section.title}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className="mt-2 text-sm leading-relaxed text-text-dim">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </Card>
      </main>
    </>
  );
}


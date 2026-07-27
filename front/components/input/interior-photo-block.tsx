export default function InteriorPhotoBlock({ dataUrl, loading, remaining, onGenerate, onRemove }) {
  const hasPhoto = dataUrl && dataUrl !== 'removed'
  const exhausted = remaining === 0

  return (
    <div className="interior-block">
      {hasPhoto ? (
        <div className="interior-block__preview">
          <img src={dataUrl} alt="Фото в интерьере" />
          <button type="button" className="interior-block__remove" onClick={onRemove} title="Удалить">×</button>
        </div>
      ) : (
        <div className="interior-block__empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
            <rect x="6" y="7" width="6" height="6" rx="1"/>
          </svg>
          <p>Фото работы в интерьере не добавлено</p>
        </div>
      )}

      <div className="interior-block__actions">
        <button
          type="button"
          className={`art-btn art-btn--ghost interior-block__btn${loading ? ' is-loading' : ''}${exhausted ? ' is-disabled' : ''}`}
          onClick={onGenerate}
          disabled={loading || exhausted}
        >
          {loading ? (
            <>
              <span className="interior-block__spinner" />
              Генерируем…
            </>
          ) : (
            <>✦ {hasPhoto ? 'Перегенерировать' : 'Сгенерировать ИИ'}</>
          )}
        </button>

        {remaining !== null && (
          <span className="interior-block__quota">
            {exhausted ? 'Лимит на сегодня исчерпан' : `Осталось попыток: ${remaining}`}
          </span>
        )}
      </div>
    </div>
  )
}

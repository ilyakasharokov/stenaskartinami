import { YMaps, Map, Placemark, ZoomControl } from 'react-yandex-maps';
import Link from 'next/link';

export default function YandexMap({ walls, mapOnly = false }) {
  if (!walls?.length) return null;

  const mapEl = (
    <YMaps>
      <Map
        defaultState={{ center: [58.456994503197755, 35.370069459975745], zoom: 5 }}
        style={{ width: '100%', height: '300px' }}
      >
        <ZoomControl />
        {walls.map((wall, i) =>
          wall.Coordinates && (
            <Placemark
              key={i}
              geometry={wall.Coordinates.center}
              options={{
                iconLayout: 'default#image',
                iconImageSize: [40, 40],
                iconImageOffset: [-20, -20],
                iconImageHref: '/images/mapicon.png',
              }}
              properties={{
                balloonContentHeader: wall.Title,
                balloonContentBody: wall.Address,
                balloonContentFooter: `<a href="${'/walls/' + wall.slug + '--' + wall.id}">Перейти</a>`,
              }}
              modules={['geoObject.addon.balloon', 'geoObject.addon.hint', 'layout.ImageWithContent']}
            />
          )
        )}
      </Map>
    </YMaps>
  );

  if (mapOnly) return mapEl;

  return (
    <div className="index-page__map">
      <h2>Стены на карте</h2>
      {mapEl}
      <Link href="/add-wall" className="btn">Добавить стену</Link>
    </div>
  );
}

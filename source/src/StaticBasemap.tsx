import { TileLayer } from 'react-leaflet'

// Static publishing does not need a WebGL worker or a map API key. Keep TREK's
// original shared-map markers, viewport and order lines on a raster basemap.
export default function StaticBasemap() {
  return <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} maxZoom={19} />
}

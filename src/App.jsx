import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const TILE_DATA_URL = "./tiles.json";

function FitBounds({ tiles }) {
  const map = useMap();

  useEffect(() => {
    if (tiles.length > 0) {
      const sortedTiles = [...tiles].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
      const majorityStart = Math.floor(tiles.length * 0.3);
      const majorityEnd = Math.ceil(tiles.length * 0.7);
      const majorityTiles = sortedTiles.slice(majorityStart, majorityEnd);
      const bounds = L.latLngBounds(majorityTiles.map(({ lat, lng }) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [tiles, map]);

  return null;
}

function KeyboardNavigation({ tiles, currentIndex, setCurrentIndex }) {
  const map = useMap();

  const findClosestInDirection = (direction) => {
    if (currentIndex === null || tiles.length === 0) return currentIndex;
    const { lat, lng } = tiles[currentIndex];

    let closestIndex = null;
    let minDistance = Infinity;

    tiles.forEach((tile, index) => {
      if (index === currentIndex) return;
      const dLat = tile.lat - lat;
      const dLng = tile.lng - lng;
      let isValid = false;

      if (direction === "ArrowRight" && dLng > 0) isValid = true;
      if (direction === "ArrowLeft" && dLng < 0) isValid = true;
      if (direction === "ArrowUp" && dLat > 0) isValid = true;
      if (direction === "ArrowDown" && dLat < 0) isValid = true;

      if (isValid) {
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });
    return closestIndex !== null ? closestIndex : currentIndex;
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      const newIndex = findClosestInDirection(event.key);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        map.flyTo([tiles[newIndex].lat, tiles[newIndex].lng], map.getZoom(), {
          animate: true,
          duration: 0.5
        });
      }
    },
    [currentIndex, tiles, map, setCurrentIndex]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
}

export default function TileMap() {
  const [tiles, setTiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(null);

  useEffect(() => {
    fetch(TILE_DATA_URL)
      .then((res) => res.json())
      .then((data) => setTiles(data))
      .catch((err) => console.error("Error loading tiles.json", err));
  }, []);

  return (
    <>
      <MapContainer
        style={{ height: "100vh", width: "100vw" }}
        zoom={14}
        keyboard={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <FitBounds tiles={tiles} />
        <KeyboardNavigation tiles={tiles} currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} />
        {tiles.map(({ name, marker, lat, lng }, index) => (
          <Marker key={name} position={[lat, lng]}
            icon={L.icon({
              iconUrl: marker,
              iconSize: index === currentIndex ? [80, 100] : [40, 50],
              iconAnchor: index === currentIndex ? [40, 100] : [20, 50]
            })}
            keyboard={false}
            eventHandlers={{
              click: () => setCurrentIndex(index)
            }}
            zIndexOffset={index === currentIndex ? 10000 : 0}
          />
        ))}
      </MapContainer>

      {currentIndex !== null && (
        <aside className="thumb">
          <img src={tiles[currentIndex].thumbnail} alt={tiles[currentIndex].name} />
        </aside>
      )}
    </>
  );
}

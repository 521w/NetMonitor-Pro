import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flow } from '../types';

// Leaflet icon fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export const NetworkMap = ({ flows, suspiciousIps }: { flows: Flow[], suspiciousIps: string[] }) => {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden grayscale brightness-75 contrast-125">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {flows.map(flow => {
          const isSrcSuspicious = suspiciousIps.includes(flow.srcIp);
          const isDstSuspicious = suspiciousIps.includes(flow.dstIp);

          return (
            <React.Fragment key={flow.id}>
              <Marker 
                position={[flow.srcLat, flow.srcLng]}
                icon={isSrcSuspicious ? L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div class="relative"><div class="w-4 h-4 bg-rose-500 rounded-full animate-ping absolute -inset-0"></div><div class="w-4 h-4 bg-rose-600 rounded-full border-2 border-white relative"></div></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                }) : DefaultIcon}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className={isSrcSuspicious ? "text-rose-500" : ""}>
                      {isSrcSuspicious ? "⚠️ 嫌疑源:" : "源地址:"}
                    </strong> {flow.srcIp}<br/>
                    <strong>进程:</strong> {flow.process}
                  </div>
                </Popup>
              </Marker>
              <Marker 
                position={[flow.dstLat, flow.dstLng]}
                icon={isDstSuspicious ? L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="relative"><div class="w-4 h-4 bg-rose-500 rounded-full animate-ping absolute -inset-0"></div><div class="w-4 h-4 bg-rose-600 rounded-full border-2 border-white relative"></div></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  }) : DefaultIcon}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className={isDstSuspicious ? "text-rose-500" : ""}>
                      {isDstSuspicious ? "⚠️ 嫌疑目标:" : "目标地址:"}
                    </strong> {flow.dstIp}
                  </div>
                </Popup>
              </Marker>
              <Polyline 
                positions={[
                  [flow.srcLat, flow.srcLng],
                  [flow.dstLat, flow.dstLng]
                ]}
                color={isSrcSuspicious || isDstSuspicious ? "#f43f5e" : "#3b82f6"}
                weight={isSrcSuspicious || isDstSuspicious ? 2 : 1}
                opacity={isSrcSuspicious || isDstSuspicious ? 0.6 : 0.3}
                dashArray={isSrcSuspicious || isDstSuspicious ? undefined : "5, 5"}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

(() => {
  'use strict';
  const STYLES = {
    liberty:{label:'Liberty',url:'https://tiles.openfreemap.org/styles/liberty'},
    bright:{label:'Bright',url:'https://tiles.openfreemap.org/styles/bright'},
    positron:{label:'Positron',url:'https://tiles.openfreemap.org/styles/positron'},
    fiord:{label:'Fiord',url:'https://tiles.openfreemap.org/styles/fiord'}
  };
  const registry = new Map();

  function destroy(id){
    const item=registry.get(id); if(!item) return;
    try{ item.map.remove(); }catch(_){ }
    registry.delete(id);
  }
  function destroyAll(){ [...registry.keys()].forEach(destroy); }

  function create(id, options={}) {
    destroy(id);
    const el=document.getElementById(id);
    if(!el) return null;
    if(!window.maplibregl){
      el.innerHTML='<div class="map-fallback">Kortmotoren kunne ikke indlæses. Appens øvrige funktioner virker stadig.</div>';
      return null;
    }
    const style=STYLES[options.styleKey]||STYLES.liberty;
    const map=new maplibregl.Map({container:id,style:style.url,center:options.center||[9.5,55.8],zoom:options.zoom||4,attributionControl:true});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    const markers=[];
    map.on('load',()=>{
      (options.places||[]).forEach(place=>{
        if(!Number.isFinite(Number(place.lng))||!Number.isFinite(Number(place.lat))) return;
        const node=document.createElement('button');
        node.type='button';node.className='marker-pin';node.title=place.name||'';
        node.style.border='0';node.style.backgroundColor='transparent';node.style.cursor='pointer';
        node.style.backgroundImage=`url('${place.status==='visited'?(options.visitedIcon||'assets/map-visited-v21.svg'):(options.wishIcon||'assets/map-wish-v21.svg')}')`;
        const popup=new maplibregl.Popup({offset:20}).setHTML(`<strong>${escapeHtml(place.name||'Campingplads')}</strong><br><span>${escapeHtml([place.city,place.country].filter(Boolean).join(', '))}</span><br><button data-open-place="${escapeHtml(place.id||'')}">Åbn detaljer</button>`);
        const marker=new maplibregl.Marker({element:node,anchor:'bottom'}).setLngLat([Number(place.lng),Number(place.lat)]).setPopup(popup).addTo(map);
        markers.push(marker);
      });
      if(options.routeGeoJSON){ upsertLine(map,'route-line',options.routeGeoJSON,options.routeColor||'#d86c28'); }
      if(options.routePoints){ addRoutePointMarkers(map,options.routePoints,options); }
      if(options.fitAll!==false){ fit(map, [...(options.places||[]).map(p=>[Number(p.lng),Number(p.lat)]),...(options.routePoints||[]).map(p=>[Number(p.lng),Number(p.lat)])].filter(pair=>pair.every(Number.isFinite))); }
    });
    map.on('click',e=>options.onClick?.({lng:e.lngLat.lng,lat:e.lngLat.lat}));
    registry.set(id,{map,markers});
    return map;
  }

  function fit(map, coords){
    if(!coords.length) return;
    if(coords.length===1){ map.flyTo({center:coords[0],zoom:10});return; }
    const bounds=coords.reduce((b,c)=>b.extend(c),new maplibregl.LngLatBounds(coords[0],coords[0]));
    map.fitBounds(bounds,{padding:70,maxZoom:12,duration:0});
  }
  function upsertLine(map,id,geojson,color='#d86c28'){
    if(!map?.isStyleLoaded()) return;
    const data=geojson?.type==='FeatureCollection'?geojson:{type:'FeatureCollection',features:geojson?.type==='Feature'?[geojson]:[]};
    if(map.getSource(id)) map.getSource(id).setData(data); else {
      map.addSource(id,{type:'geojson',data});
      map.addLayer({id,type:'line',source:id,paint:{'line-color':color,'line-width':5,'line-opacity':.9}});
    }
  }
  function addRoutePointMarkers(map,points,options){
    points.forEach((p,index)=>{
      const img=index===0?(options.startIcon||'assets/route-start-v21.svg'):index===points.length-1?(options.endIcon||'assets/route-end-v21.svg'):(options.viaIcon||'assets/route-via-v21.svg');
      const el=document.createElement('div');el.className='marker-pin';el.style.backgroundImage=`url('${img}')`;
      new maplibregl.Marker({element:el,draggable:Boolean(options.draggable)}).setLngLat([Number(p.lng),Number(p.lat)]).addTo(map).on('dragend',event=>options.onPointMove?.(index,event.target.getLngLat()));
    });
  }
  function lineFromPoints(points){return {type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'LineString',coordinates:points.map(p=>[Number(p.lng),Number(p.lat)])},properties:{}}]};}
  function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  window.VCMaps={styles:STYLES,create,destroy,destroyAll,fit,upsertLine,lineFromPoints};
})();

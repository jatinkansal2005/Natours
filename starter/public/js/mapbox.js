export const displayMap=locations => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiamF0aW5rYW5zYWw2NCIsImEiOiJjbDJhMTYxenEwMGlpM3Bub2d4bjlqbnlkIn0.gboI_im4GQUufL2htL2TrA';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/jatinkansal64/cl2a32zac005t17pr9utt05i6', // style URL
    scrollZoom: false
    // center: [-118.113491, 34.111745], // starting position [lng, lat]
    // zoom: 10, // starting zoom

});

const bounds=new mapboxgl.LngLatBounds();

locations.forEach(loc => {
    //create marker
    const el=document.createElement('div');
    el.className='marker';

    //add marker
    new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
    }).setLngLat(loc.coordinates)
    .addTo(map);

    //add popup
    new mapboxgl.Popup({
        offset: 30
    })
    .setLngLat(loc.coordinates)
    .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
    .addTo(map);

    //extend map bounds to include current location
    bounds.extend(loc.coordinates);
});

map.fitBounds(bounds,{
    padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100
    }
});
}
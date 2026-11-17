// The SVG uses xMidYMid meet; account for letterboxing on narrow/tall viewports.
export function chartIndexAtClientX(clientX,bounds,count){
 if(count<=1)return 0;
 const scale=Math.min(bounds.width/790,bounds.height/300);
 if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(clientX))return null;
 const inset=(bounds.width-790*scale)/2,svgX=(clientX-bounds.left-inset)/scale;
 return Math.max(0,Math.min(count-1,Math.round((svgX-18)/670*(count-1))));
}

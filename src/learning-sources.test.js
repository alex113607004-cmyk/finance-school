import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {units,resources,sourceById} from './data';
const audit=JSON.parse(fs.readFileSync('docs/learning-source-audit.json'));
describe('learning-source provenance',()=>{
 it('ties every top-of-unit takeaway to listed original sources',()=>{
  for(const unit of units){for(const point of unit.takeaways){expect(point.sourceIds.length).toBeGreaterThan(0);for(const id of point.sourceIds){expect(unit.sourceIds).toContain(id);expect(sourceById[id]).toBeTruthy();}}}
 });
 it('retains reviewed page records rather than unverified search links',()=>{
  expect(resources).toHaveLength(24);expect(new Set(resources.map(r=>r.url)).size).toBe(24);
  for(const r of resources){const check=audit.sources.find(s=>s.id===r.id);expect(check.status).toBe(200);expect(check.finalUrl).toBe(r.url);expect(check.reviewedSections).toBeTruthy();expect(check.unitIds.length).toBeGreaterThan(0);expect(r.publisher).toBeTruthy();expect(r.language).toMatch(/繁體中文|英文/);expect(r.url).toMatch(/^https:\/\//);}
 });
 it('distinguishes linked video materials from reviewed text summaries',()=>{
  const videos=resources.filter(r=>r.kind==='video');expect(videos).toHaveLength(4);
  for(const video of videos){const record=audit.sources.find(s=>s.id===video.id);expect(record.videoMedia.status).toBe(200);expect(record.videoMedia.contentType).toMatch(/^video\/mp4/);}
  expect(sourceById.margin.scope).toContain('不可直接套用台股');
 });
});

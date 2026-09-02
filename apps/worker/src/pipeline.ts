import {
  SourceVideo,
  Transcript,
  Moment,
  Script,
  ScriptCritique,
  RenderJob,
} from "@viralclip/shared";

export interface AgentServices {
  evaluateSource(source: SourceVideo): Promise<{ score: number; category: string; reason: string; recommended: boolean }>;
  transcribe(source: SourceVideo): Promise<Transcript>;
  findMoments(source: SourceVideo, transcript: Transcript): Promise<Omit<Moment, "id" | "status" | "createdAt" | "updatedAt">[]>;
  writeScript(source: SourceVideo, moment: Moment): Promise<Omit<Script, "id" | "status" | "createdAt" | "updatedAt">>;
  critiqueScript(source: SourceVideo, script: Script): Promise<ScriptCritique>;
  generateMetadata(source: SourceVideo, script: Script): Promise<{ title: string; caption: string; hashtags: string[] }>;
  renderReel(input: {
    source: SourceVideo;
    moment: Moment;
    script: Script;
    outputPath: string;
  }): Promise<{ filePath: string; durationSec: number }>;
  qa(input: { filePath: string; width?: number; height?: number }): Promise<{ passed: boolean; score: number; issues: string[] }>;
}

export class ReelPipeline {
  constructor(
    private readonly services: AgentServices,
    private readonly opts: {
      renderWidth: number;
      renderHeight: number;
      audioDir: string;
      sourceDir: string;
      subtitleDir: string;
      renderDir: string;
    }
  ) {}

  async run(source: SourceVideo, outputPath: string): Promise<{ render: RenderJob; qa: { passed: boolean; score: number } }> {
    const evaluation = await this.services.evaluateSource(source);
    source = { ...source, evaluationScore: evaluation.score, category: evaluation.category, evaluationReason: evaluation.reason };

    const transcript = await this.services.transcribe(source);
    const candidates = await this.services.findMoments(source, transcript);
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (!best) throw new Error("no suitable moments found");

    const moment: Moment = {
      id: `mom_${Date.now()}`,
      ...best,
      status: "SELECTED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const draft = await this.services.writeScript(source, moment);
    const script: Script = {
      id: `scr_${Date.now()}`,
      ...draft,
      sourceId: source.id,
      momentId: moment.id,
      status: "GENERATED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const critique = await this.services.critiqueScript(source, script);
    script.status = critique.approved ? "APPROVED" : "REJECTED";
    script.critique = critique;
    if (!critique.approved) throw new Error(`script rejected: ${critique.issues.join("; ")}`);

    const rendered = await this.services.renderReel({ source, moment, script, outputPath });
    const qa = await this.services.qa({
      filePath: rendered.filePath,
      width: this.opts.renderWidth,
      height: this.opts.renderHeight,
    });
    const render: RenderJob = {
      id: `ren_${Date.now()}`,
      sourceId: source.id,
      momentId: moment.id,
      scriptId: script.id,
      filePath: rendered.filePath,
      durationSec: rendered.durationSec,
      resolution: `${this.opts.renderWidth}x${this.opts.renderHeight}`,
      status: qa.passed ? "QA_PASSED" : "QA_FAILED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!qa.passed) throw new Error(`qa failed: ${qa.issues.join("; ")}`);
    return { render, qa };
  }
}

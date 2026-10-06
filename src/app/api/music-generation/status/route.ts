import { NextResponse } from 'next/server';
import { MusicGenerationService } from '@/lib/music-generation/service';

export async function GET() {
  const service = new MusicGenerationService();
  return NextResponse.json({
    canonical: service.getCanonicalComposition(),
    providers: await service.capabilities(),
  });
}

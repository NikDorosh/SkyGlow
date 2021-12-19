const fragmentShader = `
uniform float iTime;
uniform vec3 iResolution;
uniform int iFrame;

#define HASHSCALE1 .1031

float hash11(float p)
{
	vec3 p3  = fract(vec3(p) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * HASHSCALE1);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}


float smoothNoise13( in vec3 x )
{
	vec3 p  = floor(x);
	vec3 f  = smoothstep(0.0, 1.0, fract(x));
	float n = p.x + p.y*57.0 + 113.0*p.z;

	return	mix(
        		mix(
                    mix( hash11( n + 0.0 ), hash11( n + 1.0 ), f.x ),
					mix( hash11( n + 57.0 ), hash11( n + 58.0 ), f.x ),
                    f.y ),
				mix(
                    mix( hash11( n + 113.0 ), hash11( n + 114.0 ), f.x ),
					mix( hash11( n + 170.0 ), hash11( n + 171.0 ), f.x),
                    f.y ),
        		f.z );
}


mat3 m = mat3( 0.00,  1.60,  1.20, -1.60,  0.72, -0.96, -1.20, -0.96,  1.28 );

float FractionalBrownianMotion( vec3 p )
{
	float f = 0.5000 * smoothNoise13( p );
    p = m * p * 1.2;
	f += 0.2500 * smoothNoise13( p );
    p = m * p * 1.3;
	f += 0.1666 * smoothNoise13( p );
    p = m * p * 1.4;
	f += 0.0834 * smoothNoise13( p );
	return f;
}

float NoisyStarField( in vec2 vSamplePos, float fThreshhold )
{
    float StarVal = hash12( vSamplePos );
    if ( StarVal >= fThreshhold )
        StarVal = pow( (StarVal - fThreshhold)/(1.0 - fThreshhold), 6.0 );
    else
        StarVal = 0.0;
    return StarVal;
}

float StableStarField( in vec2 vSamplePos, float fThreshhold )
{
    float fractX = fract( vSamplePos.x );
    float fractY = fract( vSamplePos.y );
    vec2 floorSample = floor( vSamplePos );    
    float v1 = NoisyStarField( floorSample, fThreshhold );
    float v2 = NoisyStarField( floorSample + vec2( 0.0, 1.0 ), fThreshhold );
    float v3 = NoisyStarField( floorSample + vec2( 1.0, 0.0 ), fThreshhold );
    float v4 = NoisyStarField( floorSample + vec2( 1.0, 1.0 ), fThreshhold );

    float StarVal =   v1 * ( 1.0 - fractX ) * ( 1.0 - fractY )
        			+ v2 * ( 1.0 - fractX ) * fractY
        			+ v3 * fractX * ( 1.0 - fractY )
        			+ v4 * fractX * fractY;
	return StarVal;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	float time = iTime * 0.1;
    
    vec2 vNormalizedUv = gl_FragCoord.xy / iResolution.xy;

	vec2 uv = gl_FragCoord.xy / iResolution.y;
	
	vec3 col  = vec3(0.0, 0.0, 0.0);
	
	// render sky
	col += vec3( 0.1, 0.2, 0.4 ) * vNormalizedUv.y;
    
	// moon
    vec2 vMoonPos = vec2(.5, 0.35);
    vec2 vUvMoonDiff = uv - vMoonPos-.5;
    float fMoonDot = max( 0.0, 1.0 - dot( vUvMoonDiff, vUvMoonDiff ) );
    col += vec3(0.6, 0.6, 0.6) * pow( fMoonDot, 350.0 );
	
	// moon haze
	col += vec3(0.48, 0.54, 0.6) * pow( fMoonDot, 6.0 );
    
    // Note: Choose fThreshhold in the range [0.9, 0.9999].
    // Higher values (i.e., closer to one) yield a sparser starfield.
    float StarFieldThreshhold = 0.985;

    // Stars with a slow spin.
    float fSpinRate = 0.0005;
    vec2 vInputPos = ( 2.0 * gl_FragCoord.xy/iResolution.y ) - vec2( 1.0, 1.0 );
    float fSampleAngle = fSpinRate * float( iFrame ) + atan( vInputPos.y, vInputPos.x );
    vec2 vSamplePos = ( 0.5 * length( vInputPos ) * vec2( cos( fSampleAngle ), sin( fSampleAngle ) ) + vec2( 0.5, 0.5 ) ) * iResolution.y;
    float StarVal = StableStarField( vSamplePos, StarFieldThreshhold );
    col += vec3( StarVal );

    // clouds
    vec3 vFbmInput = vec3( uv.x - time, uv.y, 0.0 );
    vec3 vFogColor = vec3(0.7, 0.7, 0.9);
    col += vNormalizedUv.y * vFogColor * FractionalBrownianMotion( vFbmInput );
    //col*=vec3(1.,0.2,0.2);
    col = pow(col,vec3(1.69));
    float gamma = 0.69;
	fragColor = vec4(col, 1.0);
    fragColor.rgb = pow(fragColor.rgb, vec3(1.0/gamma));

}





void main() {
   mainImage(gl_FragColor, gl_FragCoord.xy);
}`

export default fragmentShader;
const fragmentShader = `
uniform float iTime;
uniform float iSpeed;
uniform vec3 iResolution;
uniform int iFrame;
uniform vec3 iBright;

#define BEATMOVE 2
#define HASHSCALE1 .1031

//-------------------------------------STARS-----------------------------------------

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
//----------------------------------END OF STARS-------------------------------------
const float FREQ_RANGE = 64.0;
const float PI = 3.1415;
const float RADIUS = 0.6;
const float BRIGHTNESS = 0.2;
const float SPEED = 0.5;

//convert HSV to RGB
vec3 hsv2rgb(vec3 c){
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float getfrequency(float x) {
	return mix(vec3(0.0), vec3(floor(x * FREQ_RANGE + 1.0) / FREQ_RANGE, 0.25,1.0),iBright).x + 0.06;//GLOW------------------
}

float getfrequency_smooth(float x) {
	float index = floor(x * FREQ_RANGE) / FREQ_RANGE;
    float next = floor(x * FREQ_RANGE + 1.0) / FREQ_RANGE;
	return mix(getfrequency(index), getfrequency(next), smoothstep(0.0, 1.0, fract(x * FREQ_RANGE)));
}

float getfrequency_blend(float x) {
    return mix(getfrequency(x), getfrequency_smooth(x), 0.5);
}

vec3 doHalo(vec2 fragment, float radius) {
	float dist = length(fragment);
	float ring = 1.0 / abs(dist - radius);
	
	float b = dist < radius ? BRIGHTNESS * 0.3 : BRIGHTNESS;
	
	vec3 col = vec3(0.0);
	
	float angle = atan(fragment.x, fragment.y);
	col += hsv2rgb( vec3( ( angle + iTime * 0.25 ) / (PI * 2.0), 1.0, 1.0 ) ) * ring * b;
	
	float frequency = max(getfrequency_blend(abs(angle / PI)) - 0.02, 0.0);
	col *= frequency;
	
	// Black halo
	col *= smoothstep(radius * 0.5, radius, dist);
	
	return col;
}

vec3 doLine(vec2 fragment, float radius, float x) {
	vec3 col = hsv2rgb(vec3(x * 0.23 + iTime * 0.12, 1.0, 1.0));
	
	float freq = abs(fragment.x * 0.5);
	
	col *= (1.0 / abs(fragment.y)) * BRIGHTNESS * getfrequency(freq);	
	col = col * smoothstep(radius, radius * 1.8, abs(fragment.x));
	
	return col;
}

//END OF CIRCLE---------------------------------------------------------------

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
//-----------------------STARS------------------
	float time = iTime * 0.1;
    
    vec2 vNormalizedUv = gl_FragCoord.xy / iResolution.xy;

	vec2 st = gl_FragCoord.xy / iResolution.y;
	
	vec3 star  = vec3(0.0, 0.0, 0.0);
	
	// render sky
	star += vec3( 0.1, 0.2, 0.4 ) * vNormalizedUv.y;
    
	// moon
    vec2 vMoonPos = vec2(.5, 0.15);
    vec2 vUvMoonDiff = st - vMoonPos-.5;
    float fMoonDot = max( 0.0, 1.0 - dot( vUvMoonDiff, vUvMoonDiff ) );
    star += vec3(0.6, 0.6, 0.6) * pow( fMoonDot, 350.0 );
	
	// moon haze
	star += vec3(0.48, 0.54, 0.6) * pow( fMoonDot, 6.0 );
    
    // Note: Choose fThreshhold in the range [0.9, 0.9999].
    // Higher values (i.e., closer to one) yield a sparser starfield.
    float StarFieldThreshhold = 0.985;

    // Stars with a slow spin.
    float fSpinRate = 0.0005;
    vec2 vInputPos = ( 2.0 * gl_FragCoord.xy/iResolution.y ) - vec2( 1.0, 1.0 );
    float fSampleAngle = fSpinRate * float( iFrame ) + atan( vInputPos.y, vInputPos.x );
    vec2 vSamplePos = ( 0.5 * length( vInputPos ) * vec2( cos( fSampleAngle ), sin( fSampleAngle ) ) + vec2( 0.5, 0.5 ) ) * iResolution.y;
    float StarVal = StableStarField( vSamplePos, StarFieldThreshhold );
    star += vec3( StarVal );

    // clouds
    vec3 vFbmInput = vec3( st.x - time, st.y, 0.0 );
    vec3 vFogColor = vec3(0.7, 0.7, 0.9);
    star += vNormalizedUv.y * vFogColor * FractionalBrownianMotion( vFbmInput );

    //star = pow(star,vec3(1.69));
    float gamma = 0.19;
	star = pow(star, vec3(1.0/gamma));
//-----------------------END OF STARS------------------


 //-----------------------CIRCLE------------------
 	vec2 fragPos = gl_FragCoord.xy / iResolution.xy;
	
	fragPos = (fragPos - 0.5) * 2.0;
    fragPos.x *= iResolution.x / iResolution.y;
	//fragPos = abs(fragPos);

	vec3 color = vec3(0.0134, 0.052, 0.1);
	color += doHalo(fragPos, RADIUS);

    float c = cos(iSpeed * SPEED);
    float s = sin(iSpeed * SPEED);
    vec2 rot = mat2(c,s,-s,c) * fragPos;
	color += doLine(rot, RADIUS, rot.x);
	
	color += max(luma(color) - 1.0, 0.0);
//----------------------END OF CIRCLE---------------------	
	
	fragColor.rgb = star;
    fragColor.rgb+=color;
	
	fragColor.a = 1.0;
    //fragColor.rgb = pow(fragColor.rgb, vec3(1.0/gamma));//GAMMA
	
}



void main() {
   mainImage(gl_FragColor, gl_FragCoord.xy);
}`

export default fragmentShader;
///-----------------------------------------------------------------------
/// Copyright (c) 2017 Snap Inc.
/// Modified 09/21/2021 4.6.0
///-----------------------------------------------------------------------

#define SC_DISABLE_FRUSTUM_CULLING
#define SC_USE_USER_DEFINED_VS_MAIN
#define SC_USE_USER_DEFINED_VERTEX_PROCESSING

#include <std.glsl>
#include <std_vs.glsl>
#include <std_texture.glsl>

#ifdef GL_ES
#define MOBILE
#endif
#define SC_EPSILON 1e-6

float saturate(float value) {
    return clamp(value, 0.0, 1.0);
}

vec2 saturate(vec2 value) {
    return clamp(value, 0.0, 1.0);
}

vec3 saturate(vec3 value) {
    return clamp(value, 0.0, 1.0);
}

#if SC_DEVICE_CLASS >= SC_DEVICE_CLASS_B && (!defined(MOBILE) || defined(GL_FRAGMENT_PRECISION_HIGH))
#define DEVICE_IS_FAST
#endif

////////////////////////////////////////////////////////////////////////
/// GPU Particle Variables
////////////////////////////////////////////////////////////////////////

#if !defined(PIXELLIGHTING)
    #ifdef VERTEXLIGHTING
    uniform float vertexLightBlend;
    #endif
#endif //!defined(PIXELLIGHTING)

uniform float shadowSize;

#ifdef EXTERNALTIME
uniform float externalTimeInput;
#endif

#if !defined(INSTANTSPAWN)
uniform float spawnDuration;
#endif
// Time
uniform float timeGlobal;
#ifdef LIFETIMEMINMAX
uniform vec2 lifeTimeMinMax;
#endif
uniform float lifeTimeConstant;
// Spawn
#ifdef MAXPARTICLECOUNT
uniform float spawnMaxParticles;
#endif
// Color
#ifdef COLORMINMAX
uniform vec3 colorMinStart;
uniform vec3 colorMinEnd;
uniform vec3 colorMaxStart;
uniform vec3 colorMaxEnd;
#else
uniform vec3 colorStart;
#endif
// Transparency
#ifdef ALPHAMINMAX
uniform float alphaMinStart;
uniform float alphaMinEnd;
uniform float alphaMaxStart;
uniform float alphaMaxEnd;
#else
uniform float alphaStart;
#endif

#if !defined(COLORRAMP)
uniform vec3 colorEnd;
uniform float alphaEnd;
#endif

#ifdef ALPHADISSOLVE
uniform float alphaDissolveMult;
#endif

#if !defined(VELOCITYDIR)
uniform vec2 rotationRandom; // Normalized Mininum Value -1 to 1
uniform vec2 rotationRate; // Normalized Mininum Value -1 to 1
uniform float rotationDrag;
#endif
// Spawn Location
#ifdef BOXSPAWN
uniform vec3 spawnBox;
#endif
#ifdef SPHERESPAWN
uniform vec3 spawnSphere;
#endif
#ifdef INILOCATION
uniform vec3 spawnLocation;
#endif
// Size
#ifdef SIZEMINMAX
uniform vec2 sizeStartMin;
uniform vec2 sizeStartMax;
uniform vec2 sizeEndMin;
uniform vec2 sizeEndMax;
#else
uniform vec2 sizeStart;
#endif // SIZEMINMAX

#ifdef SIZERANDOMOVERLIFE
uniform vec2 sizeRandomStart;
uniform vec2 sizeRandomEnd;
#else
uniform vec2 sizeRandom;
#endif // SIZERANDOMOVERLIFE

uniform vec2 sizeEnd;
uniform float sizeSpeed;
#ifdef VELOCITYDIR
uniform float sizeVelScale;
#endif
// Velocity
uniform vec3 velocityMin; // Normalized Mininum Value -1 to 1
uniform vec3 velocityMax;
uniform vec3 velocityDrag; // 0-1 range 0 = full drag 1 = no drag
// Force
uniform float gravity;
#ifdef FORCE
uniform vec3 localForce;
#endif

#ifdef NOISE
uniform vec3 noiseMult;
uniform vec3 noiseFrequency;
#endif

#ifdef SNOISE
uniform vec3 sNoiseMult;
uniform vec3 sNoiseFrequency;
#endif

#ifdef BASETEXTURE
    #ifdef FLIPBOOK
    uniform float numValidFrames;
    uniform vec2 gridSize;
    uniform float flipBookSpeedMult;
    uniform float flipBookRandomStart;
    #endif
    #ifdef VECTORFIELD
    uniform float flowStrength;
    uniform float flowSpeed;
    #endif
#endif

#if !defined(COLLISIONPLANE)
    #ifdef COLLISION
    uniform float collParticleOffset;
    uniform float collBounceness;
    uniform int collNumBounce;
    #endif
#endif

#if !defined(COLLISION)
    #ifdef COLLISIONPLANE
    uniform float collPlaneHeight;
    #endif
#endif

#ifdef SCREENFADE
    uniform float fadeDistanceVisible;
    uniform float fadeDistanceInvisible;
#endif


// Textures ////////////////


DECLARE_TEXTURE(distortionTex)
DECLARE_TEXTURE(mainTexture)



DECLARE_TEXTURE(colorRampTexture)
uniform vec4 colorRampMult;



DECLARE_TEXTURE(ULFTexture)
uniform float lightPow;

DECLARE_TEXTURE(vectorTexture)
uniform float distStrength;

DECLARE_TEXTURE(velRampTexture)


DECLARE_TEXTURE(sizeRampTexture)



DECLARE_TEXTURE(depthTexture)
uniform float maxDepthViewDistance;
uniform float softDepthFactor;



DECLARE_TEXTURE(cameraLightTexture)
uniform float cameraLightBlend;


/////////////////////////////

uniform float externalSeed;
////////////////////////////////////////////////////////////////////////

//-----------------------------------------------------------------------
// Global defines
//-----------------------------------------------------------------------

#define PI 3.141592653589793238462643383279

//-----------------------------------------------------------------------
// Varyings
//-----------------------------------------------------------------------

varying vec4 varColor;
varying vec4 varScreenUV;
varying vec4 varViewPos;

// Optional Variables
#ifdef SCREENFADE
    varying float nearCameraFade;
#endif

#ifdef BASETEXTURE
    #ifdef FLIPBOOK
        varying float varFlipbookTime;
    #endif
#endif

#ifdef COLORRAMP
    varying float varColorRampU;
#endif

#ifdef ALPHADISSOLVE
    varying float varDissolve;
#endif

#if !defined(VERTEXLIGHTING)
    #ifdef PIXELLIGHTING
        varying vec3 varDRB;
        varying vec3 varULF;
        varying vec3 varLightColor;
    #endif
#endif

#if !defined(PIXELLIGHTING)
    #ifdef VERTEXLIGHTING
        varying vec3 varLightColor;
        varying vec3 varLightDirection;
        varying float varDiffuseContribution;
    #endif
#endif

#ifdef VERTEX_SHADER
attribute vec4 color;
////////////////////////////////////////////////////////////////////////
// GPU Particle Functions
////////////////////////////////////////////////////////////////////////

// Simplex 2D noise
#ifdef SNOISE
#if defined(DEVICE_IS_FAST)
vec3 permute(vec3 x) {return mod(((x * 34.0) + 1.0) * x, 289.0);}
float sNoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 -vec3(dot(x0, x0), dot(x12.xy, x12.xy),  dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) -1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 -0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
#else
float sNoise(vec2 v) {
    return 0.0;
}
#endif
vec3 simplexNoise(float randX, float randY, float randZ, vec3 sNoiseFrequency, vec3 sNoiseMult, vec3 random, float time) {
    float sNoiseX = sNoise(vec2(randX * time, sNoiseFrequency.x));
    float sNoiseY = sNoise(vec2(randY * time, sNoiseFrequency.y));
    float sNoiseZ = sNoise(vec2(randZ * time, sNoiseFrequency.z));
    return vec3(sNoiseX, sNoiseY, sNoiseZ) * sNoiseMult * random;
}
#endif


vec3 particleLightDirection(vec3 worldPos) {
    vec3 lightDirection = vec3(0.0, 1.0, 0.0);

    #ifdef sc_DirectionalLightsCount
        sc_DirectionalLight_t dLight = sc_DirectionalLights[0];
        lightDirection = dLight.direction;
    #endif

    #ifdef sc_PointLightsCount
        sc_PointLight_t pLight = sc_PointLights[0];
        lightDirection = pLight.position - worldPos;
    #endif

    return lightDirection;
}

vec3 particleVertexLightDirection(vec3 worldPos) {
    vec3 lightDirection = vec3(0.0, 1.0, 0.0);

    #ifdef sc_DirectionalLightsCount
        sc_DirectionalLight_t dLight = sc_DirectionalLights[0];
        lightDirection = dLight.direction;
    #endif

    #ifdef sc_PointLightsCount
        sc_PointLight_t pLight = sc_PointLights[0];
        lightDirection = pLight.position;
    #endif

    return lightDirection;
}

vec3 particleLightColor() {
    vec4 lightColor = vec4(1.0, 1.0, 1.0, 1.0);

    #ifdef sc_DirectionalLightsCount
        for(int i = 0; i < sc_DirectionalLightsCount; ++i) {
            sc_DirectionalLight_t light = sc_DirectionalLights[i];
            lightColor = light.color;
        }
    #endif

    #ifdef sc_PointLightsCount
        for(int i = 0; i < sc_PointLightsCount; ++i) {
            sc_PointLight_t light = sc_PointLights[i];
            lightColor = light.color;
        }
    #endif
    lightColor.rgb = lightColor.rgb * lightColor.a;
    return lightColor.rgb;
}

vec3 sineNoise(vec3 noiseFrequency, vec3 noiseMult, vec3 random, float time) {
    #if defined(DEVICE_IS_FAST)
        float noiseX = sin(time * noiseFrequency.x);
        float noiseY = sin(time * noiseFrequency.y);
        float noiseZ = sin(time * noiseFrequency.z);
        vec3 noiseMix = vec3(noiseX, noiseY, noiseZ) * noiseMult * random;
        return noiseMix;
    #else 
        return vec3(0.0);
    #endif
}

vec3 pVelocity(vec3 velRange, float localTime, vec3 velocityDrag, vec3 noiseXYZ ,float normTime) {
    vec3 velDrag = pow(vec3(localTime, localTime, localTime), velocityDrag);
    vec3 velOut = (velRange + noiseXYZ) * velDrag;
    #ifdef VELRAMP
        float velRampPanning = floor(normTime * 10000.0) / 10000.0;
        vec2 velRampUV = varTex0 / vec2(10000.0, 1.0) + vec2(velRampPanning, 0.0);
        #ifdef DEVICE_IS_FAST
            vec3 velRampTex = texture2D(velRampTexture,velRampUV).xyz;
            velOut = (velRange + noiseXYZ) * velRampTex;
        #else
            vec3 velRampTex = vec3(1.0);
        #endif
    #endif

    return velOut;
}

vec2 pSize(float random1,float random2, float normTime, float sizeSpeed) {
    float sizePow = pow(normTime, sizeSpeed);
    #if !defined(SIZERAMP)
        #ifdef SIZEMINMAX
            vec2 psizeStart = mix(sizeStartMin,sizeStartMax,random1);
            vec2 psizeEnd = mix(sizeEndMin,sizeEndMax,random2);
        #else
            vec2 psizeStart = sizeStart;
            vec2 psizeEnd = sizeEnd;
        #endif
        vec2 sizeLife = mix(psizeStart, psizeEnd, sizePow);
    #else
        #ifdef DEVICE_IS_FAST
            #ifdef SIZEMINMAX
                vec2 psizeStart = mix(sizeStartMin,sizeStartMax,random1);
            #else
                vec2 psizeStart = sizeStart;
            #endif
            float sizeRampPanning = floor(normTime * 10000.0) / 10000.0;
            vec2 sizeRampUV = varTex0 / vec2(10000.0, 1.0) + vec2(sizeRampPanning, 0.0);
            vec2 sizeRampTex = texture2D(sizeRampTexture,sizeRampUV).rg;
            vec2 sizeLife = sizeRampTex * psizeStart;
        #else
            vec2 sizeLife = vec2(0.0,0.0);
        #endif // DEVICE_IS_FAST
    #endif // SIZERAMP
    return sizeLife;
}

vec2 getLifetimeMinMax() {
    #ifdef LIFETIMEMINMAX
        return lifeTimeMinMax;
    #else
        return vec2(lifeTimeConstant);
    #endif
    }

////////////////////////////////////////////////////////////////////////
void main(void) {   //////////////////////////////// Vertex Shader Main
////////////////////////////////////////////////////////////////////////
    sc_Vertex_t v;
    v.position = vec4(0.0, 0.0, 0.0, 1.0);
    varTex0 = vec2(1.0-texture0.x,1.0-texture0.y);
    // World Position Seed in Random
    float worldPosSeed = 0.0;
    #ifdef WORLDPOSSEED
    worldPosSeed = length(sc_ModelMatrix * v.position);
    #endif
    vec2 realLifeTimeMinMax = getLifetimeMinMax();
    float templifeMin = max (realLifeTimeMinMax.x,0.01);
    float seedVal = externalSeed + worldPosSeed;
    // scramble all random
    float colorRGB = color.r + color.g * color.b;
    float randAlpha = fract(colorRGB * 3.33313 + seedVal);
    float randX = fract(colorRGB * 18.98453 + seedVal);
    float randY = fract(colorRGB * 654.1559 + seedVal);
    float randZ = fract(colorRGB * 45.72241 + seedVal);
    float randIniRot = fract(colorRGB * 15.32451 + seedVal);
    float randPosX = fract(colorRGB * 82.12423 + seedVal);
    float randPosY = fract(colorRGB * 9115.215 + seedVal);
    float randPosZ = fract(colorRGB * 654.1559 + seedVal);
    float randSpawn = fract(colorRGB * 12.12358 + seedVal);
    float randTime = fract(colorRGB * 3.5358 + seedVal);
    float randspawnRate = fract(colorRGB * 1231.123123 + seedVal) * 1000.0 + 1.0;
    float randSize1 = fract(colorRGB * 334.59123123 + seedVal) - 0.5;
    float randSize2 = fract(colorRGB * 41.23123 + seedVal) - 0.5;
    vec3 randColor = fract(vec3(randPosX, randPosY, randPosZ) * 27.21883 + seedVal);
    vec3 randBoxSpawn = fract(vec3(randPosX, randPosY, randPosZ) * 313.13323 + seedVal) - 0.5;
    float randFlipbook = fract(colorRGB * 43.2234 + seedVal);
    vec3 randSphereSpawn = vec3(color.r, color.g, color.b)-0.5;
    vec3 randVel = (vec3(randY, randZ, randX) - 0.5) * 2.0;
    vec3 randRampVel = vec3(randY, randZ, randX);
    vec3 defValue = vec3(0.0, 0.0, 0.0);
    #ifdef COLORMONOMIN
        randColor = fract(vec3(randPosX, randPosX, randPosX) * 27.21883 + seedVal);
    #endif

    float time = sc_TimeElapsed;
    #ifdef EXTERNALTIME
        time = externalTimeInput;
    #endif
    // Lifetime
    #if !defined(INSTANTSPAWN)
        float constSpawn = fract((time * timeGlobal) * (1.0 / realLifeTimeMinMax.y) + randSpawn);
        float localTime = constSpawn * realLifeTimeMinMax.y;
    #else
        float localTime = timeGlobal * time;
    #endif

    float normTimeMult = mix(localTime / templifeMin, localTime / realLifeTimeMinMax.y, randTime);
    float normTime = clamp(normTimeMult, 0.0, 1.0);
    float spawnControl = 0.0;

    #if !defined(INSTANTSPAWN)
        if (spawnDuration != 0.0)
        {
            if (time - spawnDuration >= localTime)
            {spawnControl = 1.0;}
        }
    #endif

    float dieController = normTimeMult + spawnControl;
    float dieTrigger = 1.0;

    #ifdef MAXPARTICLECOUNT
    if (dieController >= 0.99 || randspawnRate >= spawnMaxParticles)
        {dieTrigger = 0.0;}
    #else
    if (dieController >= 0.99)
        {dieTrigger = 0.0;}
    #endif

    // Spawn Location
    vec3 calspawnBoxLoc = defValue;
    vec3 calspawnSphere = defValue;
    vec3 iniLoc = defValue;

    #ifdef BOXSPAWN
        calspawnBoxLoc = spawnBox * randBoxSpawn;
    #endif

    #ifdef SPHERESPAWN
        calspawnSphere = spawnSphere * randSphereSpawn;
    #endif

    #ifdef INILOCATION
        iniLoc = spawnLocation;
    #endif

    vec3 spawnLoc = iniLoc + calspawnSphere + calspawnBoxLoc;
    // Forces - Gravity
    vec3 gravityWorld = vec3(0.0, gravity / 2.0 * localTime * localTime, 0.0);
    // Forces - Local Force
    vec3 localForceWorld = defValue;
    #ifdef FORCE
        localForceWorld = localForce / 2.0 * localTime * localTime;
    #endif
    // Forces - Noise
    vec3 noiseXYZ = defValue;
    #ifdef NOISE
        noiseXYZ += sineNoise(noiseFrequency, noiseMult, randVel, normTime);
    #endif
    // Forces - SNoise
    #ifdef SNOISE
        noiseXYZ += simplexNoise(randX, randY, randZ, sNoiseFrequency, sNoiseMult, randVel, localTime);
    #endif
    // Velocity
    vec3 velRange = velocityMin + (((randVel - -1.0) / (2.0)) * (velocityMax - velocityMin));
    #ifdef VELRAMP
    velRange = mix(velocityMin,velocityMax,randRampVel);
    #endif
    vec3 velocityXYZ = pVelocity(velRange, localTime, velocityDrag, noiseXYZ, normTime);
    vec3 worldPosRelToSpawn = ((velocityXYZ + gravityWorld + localForceWorld) * sc_NormalMatrixInverse);  // World space position of the particle relative to its spawn point.
    // Size
    vec2 sizeLife = pSize(randSize1,randSize2, normTime, sizeSpeed);
    #if !defined(COLLISIONPLANE)
        #ifdef COLLISION
            vec3 originalVel = velRange;
            if(originalVel.x == 0.0) {
                originalVel.x = 1.0;
            }
            if(originalVel.z == 0.0) {
                originalVel.z = 1.0;
            }
            float gravityScale = 1.0;
            float dampFactor = 1.0;
            float curVel = originalVel.y;
            float curTime = localTime;
            float iniHeight = spawnLoc.y - (collParticleOffset * sizeLife.y);
            int iteration = 0;
            vec3 horizVel = originalVel;
            horizVel.y = 0.0;
            vec3 startPosition = spawnLoc;

            for (;iteration < collNumBounce; ++iteration)
                {
                    float Vh = curVel * dampFactor;
                    float t = (2.0 * Vh)/length(gravity);
                    if (iteration == 0)
                    {
                        t = (2.0 * Vh + (iniHeight / 3.0) + (spawnLoc.y / 3.0)) / length(gravity);
                    }
                    if (curTime < t)
                        break;

                    curTime -= t;
                    startPosition += horizVel * t * dampFactor;
                    dampFactor = dampFactor * collBounceness;

                    if (iteration == 0)
                    {
                        startPosition.y -= iniHeight;
                    }
                }
            originalVel = originalVel * dampFactor;

            vec2 horVel = originalVel.xz;
            // Stop Gravity and Velocity when it's out of bounce.
            if (length(horVel) <= 1.0 || iteration > collNumBounce -1)
                {
                    gravityScale = 0.0;
                    originalVel = originalVel * 0.0;
                    curTime = 0.0;
                }

            spawnLoc = startPosition + noiseXYZ;
            localTime = curTime;
            // New Gravity setup for Collision
            float collisiongravityWorld = gravityScale * gravity / 2.0 * localTime * localTime;
            gravityWorld = vec3(0.0, collisiongravityWorld, 0.0);
        #endif //Collision
    #endif //CollisionPlane

    v.position.xyz = spawnLoc;

    float objScale = length(sc_ModelMatrix[0].xyz);

    vec2 quadCornerOffset = dieTrigger * (varTex0 - vec2(0.5, 0.5)) * sizeLife * objScale;
    mat4 invView = sc_ViewMatrixInverse;
    vec3 camPos = invView[3].xyz;

    vec3 zVec = normalize(vec3(sc_ViewMatrix[0][2], sc_ViewMatrix[1][2], sc_ViewMatrix[2][2]));
    vec3 sideVec = normalize(cross(zVec, vec3(0.0, 1.0, 0.0)));
    vec3 upVec = normalize(cross(sideVec, zVec));
    #if !defined(VELOCITYDIR)
        #ifdef ALIGNTOX
        sideVec = vec3(0.0, 0.0, 1.0);
        upVec = vec3(0.0, 1.0, 0.0);
        #endif
        #ifdef ALIGNTOY
        sideVec = vec3(1.0, 0.0, 0.0);
        upVec = vec3(0.0, 0.0, 1.0);
        #endif
        #ifdef ALIGNTOZ
        sideVec = vec3(1.0, 0.0, 0.0);
        upVec = vec3(0.0, 1.0, 0.0);
        #endif
    #endif

    #ifdef WORLDFORCE
        worldPosRelToSpawn = (velocityXYZ * sc_NormalMatrixInverse) + gravityWorld + localForceWorld;
    #endif
    // All Movement in Worldspace
    #ifdef WORLDSPACE
        float scale_x = length(sc_ModelMatrix[0].xyz);
        float scale_y = length(sc_ModelMatrix[1].xyz);
        float scale_z = length(sc_ModelMatrix[2].xyz);
        vec3 worldScale = vec3(scale_x,scale_y,scale_z);
        worldPosRelToSpawn = (velocityXYZ * worldScale) + gravityWorld + localForceWorld;
    #endif

    float rotation = PI;
    #if !defined(VELOCITYDIR)
        float iniRotation = mix(rotationRandom.x, rotationRandom.y, randIniRot);
        float rotDragPow = pow(1.0 - normTime, rotationDrag);
        float rotationRateRange = mix(rotationRate.x, rotationRate.y, randIniRot);
        float rotationByLife = rotationRateRange * rotDragPow * normTime * 2.0;
        rotation = PI * (rotationByLife + iniRotation - 0.5);
    #endif
    vec2 rotatedXAxis = vec2(cos(rotation), sin(rotation));
    vec2 rotatedYAxis = vec2(-sin(rotation), cos(rotation));
    vec3 sideVecRot = vec3(sideVec * rotatedXAxis.x + upVec * rotatedXAxis.y);
    vec3 upVecRot = vec3(sideVec * rotatedYAxis.x + upVec * rotatedYAxis.y);
    #if !defined(COLLISION)
        #ifdef COLLISIONPLANE
        if (worldPosRelToSpawn.y <= -0.01 + collPlaneHeight)
            {
                vec4 ModelMatrixScale = sc_ModelMatrix * vec4(collPlaneHeight, collPlaneHeight, collPlaneHeight, collPlaneHeight);
                worldPosRelToSpawn.y = 0.01 + ModelMatrixScale.x;
                #if !defined(VELOCITYDIR)
                rotation = PI * iniRotation;
                rotatedXAxis = vec2(cos(rotation), sin(rotation));
                rotatedYAxis = vec2(-sin(rotation), cos(rotation));
                sideVecRot = vec3(sideVec * rotatedXAxis.x + upVec * rotatedXAxis.y);
                upVecRot = vec3(sideVec * rotatedYAxis.x + upVec * rotatedYAxis.y);
                #endif
            }
        #endif
    #endif

    float velLength = 1.0;
    #ifdef VELOCITYDIR //this calculation is not correct and can never be right until velocity is incorporated
        vec3 velocityDir = normalize(worldPosRelToSpawn + noiseXYZ + gravityWorld + localForceWorld);
        vec3 prevVel = worldPosRelToSpawn * (localTime - 0.01);
        vec3 currVel = worldPosRelToSpawn * (localTime + 0.01);
        velLength = length(currVel - prevVel) * sizeVelScale;
        sideVecRot = velocityDir;
        upVecRot = normalize(cross(sideVecRot, zVec));
    #endif
    float shadowAlphaSize = shadowSize;

    #if defined(sc_ProjectiveShadowsCaster)
        quadCornerOffset = quadCornerOffset * shadowAlphaSize;
    #endif

    #if !defined(COLLISIONPLANE)
        #ifdef COLLISION
            vec3 iniVel = originalVel * localTime + gravityWorld;
            worldPosRelToSpawn = sc_NormalMatrix * iniVel;
        #endif
    #endif

    vec3 worldPosCenter = vec3(sc_ModelMatrix * v.position) + worldPosRelToSpawn;
    vec3 worldPosCorner = worldPosCenter + upVecRot * quadCornerOffset.x + sideVecRot * (quadCornerOffset.y * velLength);

    vec3 colorStartRandom = vec3(0.0);
    vec3 colorEndRandom = vec3(0.0);
    float alphaStartRandom = 0.0;
    float alphaEndRandom = 0.0;

    #ifdef COLORMINMAX
    colorStartRandom = mix(colorMinStart, colorMaxStart, randColor);
    #else
    colorStartRandom = colorStart;
    #endif
    #ifdef ALPHAMINMAX
    alphaStartRandom = mix(alphaMinStart, alphaMaxStart, randAlpha);
    #else
    alphaStartRandom = alphaStart;
    #endif

    #if !defined(COLORRAMP)
    #ifdef COLORMINMAX
    colorEndRandom = mix(colorMinEnd, colorMaxEnd, randColor);
    #else
    colorEndRandom = colorEnd;
    #endif
    #ifdef ALPHAMINMAX
    alphaEndRandom = mix(alphaMinEnd, alphaMaxEnd, randAlpha);
    #else
    alphaEndRandom = alphaEnd;
    #endif
    colorStartRandom = mix(colorStartRandom, colorEndRandom, normTime);
    alphaStartRandom = mix(alphaStartRandom, alphaEndRandom, normTime);
    #endif

    varTex0 = texture0;
    varTex1 = texture1;

    #ifdef BASETEXTURE
        #ifdef FLIPBOOK
            #ifdef FLIPBOOKBYLIFE
            float lifetime = mix(templifeMin, realLifeTimeMinMax.y, randTime);
            localTime = localTime / lifetime;
            #endif
        // Flipbook Random Start
        float flipbookRandStart = mix(0.0, flipBookRandomStart, randFlipbook);
        vec2 texCoord0 = varTex0 / gridSize;
        // Flipbook Speed
        float currentFrame = localTime * flipBookSpeedMult + flipbookRandStart;
        currentFrame = mod(currentFrame, numValidFrames);
        float column = floor(currentFrame) * (1.0 / gridSize.x);
        float row = mod(floor(-currentFrame / gridSize.x),gridSize.y) * (1.0 / gridSize.y);

        // Flipbook Blending UV Set
        float blendFrame = currentFrame + 1.0;
        blendFrame = mod(blendFrame, numValidFrames);
        float columnBlend = floor(blendFrame) * (1.0 / gridSize.x);
        float rowBlend = floor(-blendFrame * (1.0 / gridSize.x)) * (1.0 / gridSize.y);
        // Flipbook Assignment
        varTex0 = texCoord0 + vec2(column, row);
        varTex1 = texCoord0 + vec2(columnBlend, rowBlend);
        varFlipbookTime = fract(currentFrame);
        #endif
    #endif

    varColor = vec4(colorStartRandom.rgb, alphaStartRandom);
    varViewPos = sc_ViewMatrix * vec4(worldPosCorner, 1.0);
    vec4 screenPos = sc_ViewProjectionMatrix * vec4(worldPosCorner,1.0);
    varScreenUV = screenPos;
    #ifdef ALPHADISSOLVE
        varDissolve = normTime * alphaDissolveMult;
    #endif

    #ifdef DISTORTION
        varScreenPos = sc_ModelViewProjectionMatrix * vec4(worldPosCorner,1.0);
    #endif

    #ifdef COLORRAMP
        float colorRampPanning = floor(normTime * 128.0) / 128.0;
        varColorRampU = colorRampPanning;
        #if !defined NORANDOFFSET
            varColorRampU += varTex0.x / 128.0;
        #endif
    #endif

    #if !defined(VERTEXLIGHTING)
        #ifdef PIXELLIGHTING
            vec3 lightDirection = particleLightDirection(worldPosCorner);
            vec3 lightInSpriteSpace = vec3(dot(lightDirection, sideVecRot), dot(lightDirection, upVecRot), dot(lightDirection, zVec));
            vec3 DRB = max(lightInSpriteSpace, 0.0);
            vec3 ULF = max(-lightInSpriteSpace, 0.0);
            float weight = DRB.x + DRB.y + DRB.z + ULF.x + ULF.y + ULF.z;

            vec3 preDRB = DRB / weight;
            vec3 preULF = ULF / weight;

            varULF = vec3(preULF.x, preDRB.y, preULF.z);
            varDRB = vec3(preDRB.x, preULF.y, preDRB.z);
            varLightColor = particleLightColor();
        #endif
    #endif
    #if !defined(PIXELLIGHTING)
        #ifdef VERTEXLIGHTING
            varLightColor = particleLightColor();
            varLightDirection = particleVertexLightDirection(worldPosCorner);

            vec3 spriteNormal = normalize(worldPosCorner - worldPosCenter);
            spriteNormal += vec3(sc_ViewMatrix[2][0], sc_ViewMatrix[2][1], sc_ViewMatrix[2][2]);

            float vertexLightDir = dot(normalize(spriteNormal), normalize(varLightDirection));
            varDiffuseContribution = mix(1.0, vertexLightDir, vertexLightBlend);

        #endif
    #endif

    #ifdef SCREENFADE
        vec3 delta = sc_Camera.position - worldPosCenter;
        float distSquared = dot(delta, delta);
        float visibleDistSq = (fadeDistanceInvisible+SC_EPSILON) * (fadeDistanceInvisible+SC_EPSILON);
        float invisibleDistSq = fadeDistanceVisible * fadeDistanceVisible;
        float fadeStart = min(visibleDistSq, invisibleDistSq);
        float fadeEnd = max(visibleDistSq, invisibleDistSq);
        nearCameraFade = smoothstep(fadeStart,fadeEnd,distSquared);
        nearCameraFade = (visibleDistSq > invisibleDistSq ? 1.0 - nearCameraFade : nearCameraFade);
        worldPosCorner.xyz = nearCameraFade <= SC_EPSILON ? worldPosCenter : worldPosCorner;
    #endif

    #if sc_IsEditor && defined(SC_DISABLE_FRUSTUM_CULLING)
    {
        worldPosCorner.x += sc_DisableFrustumCullingMarker;
    }
    #endif // #if (sc_IsEditor && SC_DISABLE_FRUSTUM_CULLING)

    gl_Position = applyDepthAlgorithm(sc_ViewProjectionMatrix * vec4(worldPosCorner,1.0));
}
#endif

//-----------------------------------------------------------------------
#ifdef FRAGMENT_SHADER
//-----------------------------------------------------------------------

vec4 pack(float depth) {
    vec4 bitSh = vec4(256.0 * 256.0 * 256.0,
                    256.0 * 256.0,
                    256.0,
                    1.0);
    vec4 bitMsk = vec4(0.0,
                    1.0 / 256.0,
                    1.0 / 256.0,
                    1.0 / 256.0);
    vec4 comp = fract(depth * bitSh);
    comp -= comp.xxyz * bitMsk;
    return comp;
}

float unpack(vec4 colour) {
    vec4 bitShifts = vec4(1.0 / (256.0 * 256.0 * 256.0),
                        1.0 / (256.0 * 256.0),
                        1.0 / 256.0,
                        1.0);
    return dot(colour, bitShifts);
}
#if defined(DEVICE_IS_FAST)
float pixelLightDirection(vec3 albedo, vec2 UV, vec3 varDRB, vec3 varULF, float lightPow, sampler2D ULFTexture) {
    vec3 lightDRB = albedo;
    SAMPLE_TEX(ULFTexture, UV,0.0);
    vec3 lightULF = ULFTextureSample.rgb;
    float lightLayer1 = dot(lightDRB, varDRB);
    float lightLayer2 = dot(lightULF, varULF);
    float lightOut = lightLayer1 + lightLayer2;
    return lightOut = pow(lightOut, lightPow);
}
#else
float pixelLightDirection(vec3 albedo, vec2 UV, vec3 varDRB, vec3 varULF, float lightPow, sampler2D ULFTexture) {
    return 1.0;
}
#endif

vec3 cameraLightColor(vec3 albedo, vec3 cameraTexture, float cameraLightBlend) {
    return mix(albedo, cameraTexture, cameraLightBlend);
}
#ifdef DEPTHBLEND
float depthBlending(vec4 varViewPos, vec2 screenUV, sampler2D depthTexture, float maxDepthViewDistance, float softDepthFactor) {
    float linearDepth = (-varViewPos.z - 1.0) / maxDepthViewDistance;
    SAMPLE_TEX(depthTexture, screenUV,0.0);
    vec4 packedDepth = depthTextureSample;
    float unpackedDepth = unpack(packedDepth);
    float depthClippedFactorOut = clamp((unpackedDepth - linearDepth) * softDepthFactor * 500.0, 0.0, 1.0);
    return depthClippedFactorOut *= depthClippedFactorOut;
}
#endif

vec4 flipbookBlending(sampler2D flipbookTexture, vec2 UV0, vec2 UV1, float time) {
        vec4 albedoLerp1 = texture2D(flipbookTexture, UV0);
        vec4 albedoLerp2 = texture2D(flipbookTexture, UV1);
        return mix(albedoLerp1, albedoLerp2, time);
}
#if defined(DEVICE_IS_FAST)
vec4 vectorField(sampler2D vectorTexture, sampler2D mainTexture, vec2 UV0, float flowStrength, float flowSpeed, float time) {
    vec4 vectorTex = texture2D(vectorTexture, varTex0);
    vectorTex = (vectorTex - 0.5) * 2.0;

    float flowTime = time * flowSpeed;
    float fracTime1 = fract(flowTime + 0.5);
    float fracTime2 = fract(flowTime + 1.0);
    vec2 vectorTexTime1 = vectorTex.rg * fracTime1 * flowStrength;
    vec2 vectorTexTime2 = vectorTex.rg * fracTime2 * flowStrength;
    vec4 phase1 = texture2D(mainTexture, varTex0 + vectorTexTime1);
    vec4 phase2 = texture2D(mainTexture, varTex0 + vectorTexTime2);
    float flowLerp = abs((0.5 - fracTime1) / 0.5);
    vec4 vectorMix = mix(phase1, phase2, flowLerp);
    return vectorMix;
}
#else
vec4 vectorField(sampler2D vectorTexture, sampler2D mainTexture, vec2 UV0, float flowStrength, float flowSpeed, float time) {
    vec4 phase = texture2D(mainTexture, varTex0);
    return phase;
}
#endif
#if defined(DEVICE_IS_FAST)
vec4 screenDistortion(sampler2D distortionTex, vec2 UV, sampler2D screenTex, vec2 screenUV, float distStrength, vec4 vertexColor) {
    SAMPLE_TEX(distortionTex,UV,0.0);
    vec4 Distortion = distortionTexSample;
    Distortion.rg = Distortion.rg - 0.001953125;
    vec2 vectorMovement = (Distortion.rg * 2.0 - 1.0) * distStrength * vertexColor.a;
    float DistortionMask = Distortion.b;
    vec4 ScreenBuffer = texture2D(screenTex, screenUV + vectorMovement);
    if (DistortionMask <= 0.001)
    discard;
    return ScreenBuffer * vec4(vertexColor.rgb, 1.0);
}
#else
vec4 screenDistortion(sampler2D distortionTex, vec2 UV, sampler2D screenTex, vec2 screenUV, float distStrength, vec4 vertexColor) {
    SAMPLE_TEX(mainTexture, varTex0,0.0);
    vec4 phase = mainTextureSample;
    return phase;
}
#endif

void main(void) {

    vec4 albedo = vec4(1.0, 1.0, 1.0, 1.0);
    vec4 colorRampTex = vec4(1.0, 1.0, 1.0, 1.0);

    vec2 screenUV = varScreenUV.xy / varScreenUV.w * 0.5 + 0.5;
    float lightComp = 1.0;
    float depthClippedFactor = 1.0;

    #ifdef BASETEXTURE
        SAMPLE_TEX(mainTexture, varTex0,0.0);
        albedo = mainTextureSample;
        #ifdef FLIPBOOK
        albedo = texture2D(mainTexture, varTex0);
            #ifdef FLIPBOOKBLEND
                albedo = flipbookBlending(mainTexture, varTex0, varTex1, varFlipbookTime);
            #endif
        #endif
        #ifdef VECTORFIELD
        albedo = vectorField(vectorTexture, mainTexture, varTex0, flowStrength, flowSpeed, sc_TimeElapsed);
        #endif
    #endif

    #ifdef COLORRAMP
        SAMPLE_TEX(colorRampTexture, vec2(varColorRampU, 0.0),0.0);
        colorRampTex = colorRampTextureSample * colorRampMult;
    #endif

    #if !defined(VERTEXLIGHTING)
        #ifdef PIXELLIGHTING
            lightComp = pixelLightDirection(albedo.rgb, varTex0, varDRB, varULF, lightPow, ULFTexture);
        #endif
    #endif

    #if !defined(PIXELLIGHTING)
        #ifdef VERTEXLIGHTING
            lightComp = varDiffuseContribution;
        #endif
    #endif

    #ifdef CAMERALIGHTING
        SAMPLE_TEX(cameraLightTexture, screenUV,0.0);
        vec3 cameraTexture = cameraLightTextureSample.rgb;
        albedo.rgb = cameraLightColor(albedo.rgb, cameraTexture, cameraLightBlend);
    #endif

    #ifdef DEPTHBLEND
        depthClippedFactor = depthBlending(varViewPos, screenUV, depthTexture, maxDepthViewDistance, softDepthFactor);
    #endif

    #ifdef SCREENFADE
    albedo.a *= nearCameraFade;
    #endif

    #ifdef sc_BlendMode_Screen
    albedo.rgb *= albedo.a;
    #endif

    #ifdef DISTORTION
        gl_FragColor = screenDistortion(vectorTexture, varTex1, sc_ScreenTexture, screenUV, distStrength, varColor);
    #endif

    #if !defined(DISTORTION)
        vec4 colorMix = albedo;

        #if !defined(VERTEXLIGHTING)
            #ifdef PIXELLIGHTING
                colorMix.rgb = vec3(lightComp, lightComp, lightComp) * varLightColor;
            #endif
        #endif //!defined(VERTEXLIGHTING)

        #if !defined(PIXELLIGHTING)
            #ifdef VERTEXLIGHTING
                colorMix.rgb = albedo.rgb * varLightColor.rgb * lightComp;
            #endif
        #endif //!defined(PIXELLIGHTING)

        gl_FragColor = colorMix * varColor * colorRampTex;
        gl_FragColor.a = gl_FragColor.a * clamp(depthClippedFactor, 0.0, 1.0);

        #ifdef ALPHADISSOLVE
            gl_FragColor.a = clamp(gl_FragColor.a - varDissolve, 0.0, 1.0);
        #endif

        //Premultiplied Alpha
        #ifdef BLACKASALPHA
            float alphaFromRGB = length(gl_FragColor.rgb);
            gl_FragColor.a = alphaFromRGB;
        #endif

        #ifdef PREMULTIPLIEDCOLOR
            gl_FragColor.rgb = gl_FragColor.rgb * gl_FragColor.a;
        #endif

        // Shadow
        #if defined(sc_ProjectiveShadowsCaster)
            if (gl_FragColor.a <= 0.5)
            discard;
            gl_FragColor = getShadowColor(gl_FragColor.a);
        #endif
#endif
}
#endif

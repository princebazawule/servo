/*
** Copyright (c) 2015 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

function generateTest(internalFormat, pixelFormat, pixelType, prologue, resourcePath, defaultContextVersion) {
    var wtu = WebGLTestUtils;
    var tiu = TexImageUtils;
    var gl = null;
    var successfullyParsed = false;
    var whiteColor = [255, 255, 255, 255];
    var redColor = [255, 0, 0];
    var greenColor = [0, 255, 0];

    function init()
    {
        description('Verify texImage3D and texSubImage3D code paths taking canvas elements (' + internalFormat + '/' + pixelFormat + '/' + pixelType + ')');

        // Set the default context version while still allowing the webglVersion URL query string to override it.
        wtu.setDefault3DContextVersion(defaultContextVersion);
        gl = wtu.create3DContext("example");

        if (!prologue(gl)) {
            finishTest();
            return;
        }

        switch (gl[pixelFormat]) {
          case gl.RED:
          case gl.RED_INTEGER:
            whiteColor = [255, 0, 0, 255];
            greenColor = [0, 0, 0];
            break;
          case gl.RG:
          case gl.RG_INTEGER:
            whiteColor = [255, 255, 0, 255];
            break;
          default:
            break;
        }

        gl.clearColor(0,0,0,1);
        gl.clearDepth(1);

        var testCanvas = document.createElement('canvas');
        runTest(testCanvas);
        //document.body.appendChild(testCanvas);
    }

    function setCanvasToRedGreen(ctx) {
      var width = ctx.canvas.width;
      var height = ctx.canvas.height;
      var halfHeight = Math.floor(height / 2);
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, width, halfHeight);
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, halfHeight, width, height - halfHeight);
    }

    function drawTextInCanvas(ctx, bindingTarget) {
      var width = ctx.canvas.width;
      var height = ctx.canvas.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.font = '20pt Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1234567890", width / 2, height / 4);
    }

    function setCanvasTo257x257(ctx, bindingTarget) {
      ctx.canvas.width = 257;
      ctx.canvas.height = 257;
      setCanvasToRedGreen(ctx);
    }

    function setCanvasToMin(ctx, bindingTarget) {
      if (bindingTarget == gl.TEXTURE_CUBE_MAP) {
        // cube map texture must be square.
        ctx.canvas.width = 2;
      } else {
        ctx.canvas.width = 1;
      }
      ctx.canvas.height = 2;
      setCanvasToRedGreen(ctx);
    }

    function runOneIteration(canvas, flipY, program, bindingTarget, opt_texture, opt_fontTest)
    {
        debug('Testing ' + ' with flipY=' + flipY + ' bindingTarget=' + (bindingTarget == gl.TEXTURE_3D ? 'TEXTURE_3D' : 'TEXTURE_2D_ARRAY') +
              ' canvas size: ' + canvas.width + 'x' + canvas.height + (opt_fontTest ? " with fonts" : " with red-green"));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (!opt_texture) {
            var texture = gl.createTexture();
            // Bind the texture to texture unit 0
            gl.bindTexture(bindingTarget, texture);
            // Set up texture parameters
            gl.texParameteri(bindingTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(bindingTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
            gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        } else {
            var texture = opt_texture;
        }
        // Set up pixel store parameters
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        wtu.failIfGLError(gl, 'gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);');
        // Initialize the texture to black first
        gl.texImage3D(bindingTarget, 0, gl[internalFormat], canvas.width, canvas.height, 1 /* depth */, 0,
                      gl[pixelFormat], gl[pixelType], null);
        gl.texSubImage3D(bindingTarget, 0, 0, 0, 0, canvas.width, canvas.height, 1 /* depth */,
                         gl[pixelFormat], gl[pixelType], canvas);

        var width = gl.canvas.width;
        var height = gl.canvas.height;
        var halfHeight = Math.floor(height / 2);
        var top = flipY ? 0 : (height - halfHeight);
        var bottom = flipY ? (height - halfHeight) : 0;

        // Draw the triangles
        wtu.clearAndDrawUnitQuad(gl, [0, 255, 0, 255]);

        if (opt_fontTest) {
            // check half is a solid color.
            wtu.checkCanvasRect(
                  gl, 0, top, width, halfHeight,
                  whiteColor,
                  "should be white");
            // check other half is not a solid color.
            wtu.checkCanvasRectColor(
                  gl, 0, bottom, width, halfHeight,
                  whiteColor, 0,
                  function() {
                    testFailed("font missing");
                  },
                  function() {
                    testPassed("font renderered");
                  },
                  debug);
        } else {
            // Check the top and bottom halves and make sure they have the right color.
            debug("Checking " + (flipY ? "top" : "bottom"));
            wtu.checkCanvasRect(gl, 0, bottom, width, halfHeight, redColor,
                                "shouldBe " + redColor);
            debug("Checking " + (flipY ? "bottom" : "top"));
            wtu.checkCanvasRect(gl, 0, top, width, halfHeight, greenColor,
                                "shouldBe " + greenColor);
        }

        return texture;
    }

    function runTest(canvas)
    {
        var ctx = canvas.getContext("2d");

        var cases = [
            { flipY: true,  font: false, init: setCanvasToMin },
            { flipY: false, font: false },
            { flipY: true,  font: false, init: setCanvasTo257x257 },
            { flipY: false, font: false },
            { flipY: true,  font: true, init: drawTextInCanvas },
            { flipY: false, font: true },
        ];

        function runTexImageTest(bindingTarget) {
            var program;
            if (bindingTarget == gl.TEXTURE_3D) {
                program = tiu.setupTexturedQuadWith3D(gl, internalFormat);
            } else {  // TEXTURE_2D_ARRAY
                program = tiu.setupTexturedQuadWith2DArray(gl, internalFormat);
            }

            return new Promise(function(resolve, reject) {
                var count = 4;
                var caseNdx = 0;
                var texture = undefined;
                function runNextTest() {
                    var c = cases[caseNdx];
                    if (c.init) {
                      c.init(ctx, bindingTarget);
                    }
                    texture = runOneIteration(canvas, c.flipY, program, bindingTarget, texture, c.font);
                    // for the first 2 iterations always make a new texture.
                    if (count > 2) {
                      texture = undefined;
                    }
                    ++caseNdx;
                    if (caseNdx == cases.length) {
                        caseNdx = 0;
                        --count;
                        if (!count) {
                            resolve("SUCCESS");
                            return;
                        }
                    }
                    wtu.waitForComposite(runNextTest);
                }
                runNextTest();
            });
        }

        runTexImageTest(gl.TEXTURE_3D).then(function(val) {
            runTexImageTest(gl.TEXTURE_2D_ARRAY).then(function(val) {
                wtu.glErrorShouldBe(gl, gl.NO_ERROR, "should be no errors");
                finishTest();
            });
        });
    }

    return init;
}

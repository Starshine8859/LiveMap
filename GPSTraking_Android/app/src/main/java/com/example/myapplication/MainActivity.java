package com.example.myapplication;

import android.Manifest;
import android.animation.ValueAnimator;
import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Point;
import android.location.Location;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.ActivityRecognition;
import com.google.android.gms.location.ActivityRecognitionClient;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import org.json.JSONException;
import org.json.JSONObject;
import org.osmdroid.api.IMapController;
import org.osmdroid.config.Configuration;
import org.osmdroid.tileprovider.tilesource.TileSourceFactory;
import org.osmdroid.util.GeoPoint;
import org.osmdroid.views.MapView;
import org.osmdroid.views.overlay.Polyline;
import org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider;
import org.osmdroid.views.overlay.mylocation.IMyLocationProvider;
import org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
//    private static final String BACKEND_URL = "http://173.44.141.183:3000/api/endpoint"; // Replace with your actual backend URL

    private static final String BACKEND_URL = "http://192.168.10.185:3000/api/endpoint"; // Replace with your actual backend URL
//    private static final int MAX_PATH_POINTS = 30; // Maximum number of path points to display

    private MapView mapView;
    private AnimatedMyLocationOverlay locationOverlay;
    private FloatingActionButton btnRecenter;
    private TextView locationInfoText;

    private FusedLocationProviderClient fusedLocationClient;
    private ActivityRecognitionClient activityRecognitionClient;
    private OkHttpClient httpClient;

    private GeoPoint currentLocation;
    private String currentActivity = "Idle";
    private String deviceId;
    private double currentSpeed = 0.0;

    // Path tracking variables
    private List<GeoPoint> pathPoints = new ArrayList<>();
    private Polyline pathPolyline;

    private final ActivityResultLauncher<String[]> locationPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean fineLocationGranted = result.getOrDefault(Manifest.permission.ACCESS_FINE_LOCATION, false);
                boolean coarseLocationGranted = result.getOrDefault(Manifest.permission.ACCESS_COARSE_LOCATION, false);
                boolean activityRecognitionGranted = result.getOrDefault(Manifest.permission.ACTIVITY_RECOGNITION, false);

                if (fineLocationGranted || coarseLocationGranted) {
                    startLocationUpdates();
                    setupLocationOverlay();
                    if (activityRecognitionGranted) {
                        startActivityRecognition();
                    }
                } else {
                    Toast.makeText(this, "Location permission is required.", Toast.LENGTH_LONG).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Configuration.getInstance().load(getApplicationContext(), getSharedPreferences("osmdroid", MODE_PRIVATE));
        setContentView(R.layout.activity_main);

        mapView = findViewById(R.id.map);
        btnRecenter = findViewById(R.id.btnRecenter);
        locationInfoText = findViewById(R.id.locationInfoText);

        // Configure map settings
        mapView.setTileSource(TileSourceFactory.MAPNIK);
        mapView.setMultiTouchControls(true);
        mapView.setMinZoomLevel(2.0);
        mapView.setMaxZoomLevel(20.0);
        mapView.setHorizontalMapRepetitionEnabled(false);
        mapView.setVerticalMapRepetitionEnabled(false);

        IMapController mapController = mapView.getController();
        mapController.setZoom(10.0);

        // Initialize path polyline
        initializePathPolyline();

        // Initialize HTTP client
        httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        activityRecognitionClient = ActivityRecognition.getClient(this);

        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
//        locationInfoText.setText("Device ID: " + deviceId + "\nWaiting for location...");

        btnRecenter.setOnClickListener(v -> {
            if (currentLocation != null) {
                IMapController mapCtrl = mapView.getController();
                mapCtrl.animateTo(currentLocation);
                mapCtrl.setZoom(18.0);
            }
        });

        checkPermissionsAndStart();
    }

    private void initializePathPolyline() {
        pathPolyline = new Polyline();
        pathPolyline.getOutlinePaint().setColor(Color.BLUE);
        pathPolyline.getOutlinePaint().setStrokeWidth(8.0f);
        pathPolyline.getOutlinePaint().setAlpha(180); // Semi-transparent
        mapView.getOverlays().add(pathPolyline);
    }

    private void checkPermissionsAndStart() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            startLocationUpdates();
            setupLocationOverlay();

            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED) {
                startActivityRecognition();
            }
        } else {
            locationPermissionLauncher.launch(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACTIVITY_RECOGNITION
            });
        }
    }

    @SuppressLint("MissingPermission")
    private void setupLocationOverlay() {
        locationOverlay = new AnimatedMyLocationOverlay(new GpsMyLocationProvider(this), mapView);
        locationOverlay.enableMyLocation();
        locationOverlay.runOnFirstFix(() -> {
            currentLocation = locationOverlay.getMyLocation();
            if (currentLocation != null) {
                runOnUiThread(() -> {
                    IMapController mapController = mapView.getController();
                    mapController.setZoom(15.0);
                    mapController.animateTo(currentLocation);
                });
            }
        });

        mapView.getOverlays().add(locationOverlay);
        mapView.invalidate();
    }

    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {
        LocationRequest.Builder builder = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000);
        builder.setMinUpdateIntervalMillis(2000);
        LocationRequest request = builder.build();

        fusedLocationClient.requestLocationUpdates(request, new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    updateLocationInfo(location);
                    updatePath(location);
                    // Upload to backend whenever location updates
                    uploadLocationData(location);
                }
            }
        }, getMainLooper());
    }

    private void updatePath(Location location) {
        GeoPoint newPoint = new GeoPoint(location.getLatitude(), location.getLongitude());

        // Add new point to path
        pathPoints.add(newPoint);

        // Remove oldest points if we exceed the maximum

        // Update the polyline with current path points
        pathPolyline.setPoints(new ArrayList<>(pathPoints));

        // Refresh the map to show the updated path
        mapView.invalidate();

        Log.d(TAG, "Path updated. Points: " + pathPoints.size());
    }

    private void updateLocationInfo(Location location) {
        currentLocation = new GeoPoint(location.getLatitude(), location.getLongitude());
        currentSpeed = location.getSpeed(); // m/s

        String info = String.format(
                "\n\nLat: %.5f, Lon: %.5f\nSpeed: %.1f m/s\nActivity: %s\n",
                location.getLatitude(),
                location.getLongitude(),
                currentSpeed,
                currentActivity
        );

        locationInfoText.setText(info);
    }

    private void uploadLocationData(Location location) {
        try {
            JSONObject jsonData = new JSONObject();
            jsonData.put("deviceId", deviceId);
            jsonData.put("userid", deviceId); // Added userid field
            jsonData.put("latitude", location.getLatitude());
            jsonData.put("longitude", location.getLongitude());
            jsonData.put("speed", location.getSpeed());
            jsonData.put("status", currentActivity); // Changed from 'activity' to 'status'
            jsonData.put("activity", currentActivity); // Keep both for compatibility
            jsonData.put("timestamp", System.currentTimeMillis());
            jsonData.put("accuracy", location.getAccuracy());
            jsonData.put("altitude", location.getAltitude());
            jsonData.put("bearing", location.getBearing());

            okhttp3.MediaType JSON = okhttp3.MediaType.parse("application/json; charset=utf-8");
            okhttp3.RequestBody body = okhttp3.RequestBody.create(jsonData.toString(), JSON);

            okhttp3.Request request = new okhttp3.Request.Builder()
                    .url(BACKEND_URL)
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Authorization", "Bearer YOUR_API_TOKEN") // Add if needed
                    .build();

            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(okhttp3.Call call, IOException e) {
                    Log.e(TAG, "Failed to upload location data", e);
                    runOnUiThread(() ->
                            Toast.makeText(MainActivity.this, "Upload failed: " + e.getMessage(), Toast.LENGTH_SHORT).show()
                    );
                }

                @Override
                public void onResponse(okhttp3.Call call, okhttp3.Response response) throws IOException {
                    if (response.isSuccessful()) {
//                        Log.d(TAG, "Location data uploaded successfully");
//                        runOnUiThread(() ->
//                                Toast.makeText(MainActivity.this, "Data uploaded successfully", Toast.LENGTH_SHORT).show()
//                        );
                    } else {
                        Log.e(TAG, "Upload failed with code: " + response.code());
                        runOnUiThread(() ->
                                Toast.makeText(MainActivity.this, "Upload failed: " + response.code(), Toast.LENGTH_SHORT).show()
                        );
                    }
                    response.close();
                }
            });

        } catch (JSONException e) {
            Log.e(TAG, "Error creating JSON data", e);
        }
    }

    @SuppressLint("MissingPermission")
    private void startActivityRecognition() {
        Intent intent = new Intent(this, ActivityReceiver.class);
        intent.setPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getBroadcast(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        activityRecognitionClient.requestActivityUpdates(5000, pendingIntent)
                .addOnSuccessListener(unused -> Toast.makeText(this, "Activity updates started", Toast.LENGTH_SHORT).show())
                .addOnFailureListener(e -> Toast.makeText(this, "Activity updates failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
    }

    public void updateActivity(String activityLabel) {
        this.currentActivity = activityLabel;
        // Update the UI with the new activity
        if (currentLocation != null) {
            String info = String.format(
                    "Lat: %.5f, Lon: %.5f\nSpeed: %.1f m/s\nActivity: %s\n",
                    deviceId,
                    currentLocation.getLatitude(),
                    currentLocation.getLongitude(),
                    currentSpeed,
                    currentActivity
            );
            locationInfoText.setText(info);
        }
    }

    // Method to clear the current path (optional - you can add a button for this)
    public void clearPath() {
        pathPoints.clear();
        pathPolyline.setPoints(new ArrayList<>());
        mapView.invalidate();
        Toast.makeText(this, "Path cleared", Toast.LENGTH_SHORT).show();
    }

    // Method to change path color (optional customization)
    public void setPathColor(int color) {
        pathPolyline.getOutlinePaint().setColor(color);
        mapView.invalidate();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mapView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        mapView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Stop animation to prevent memory leaks
        if (locationOverlay != null) {
            locationOverlay.stopAnimation();
        }

        if (fusedLocationClient != null) {
            fusedLocationClient.removeLocationUpdates(new LocationCallback() {});
        }
        if (httpClient != null) {
            httpClient.dispatcher().executorService().shutdown();
        }
    }

    // Custom Animated MyLocationOverlay class with red circles and no triangle
    private class AnimatedMyLocationOverlay extends MyLocationNewOverlay {
        private ValueAnimator scaleAnimator;
        private ValueAnimator pulseAnimator;
        private float animationScale = 1.0f;
        private float pulseScale = 1.0f;
        private Paint animatedPaint;
        private Paint pulsePaint;
        private Paint centerDotPaint;

        public AnimatedMyLocationOverlay(IMyLocationProvider myLocationProvider, MapView mapView) {
            super(myLocationProvider, mapView);

            // Initialize animated paints with red colors
            animatedPaint = new Paint();
            animatedPaint.setColor(0x66FF0000); // Semi-transparent red
            animatedPaint.setAntiAlias(true);

            pulsePaint = new Paint();
            pulsePaint.setColor(0x33FF0000); // More transparent red
            pulsePaint.setAntiAlias(true);

            // Center dot paint for a solid red center
            centerDotPaint = new Paint();
            centerDotPaint.setColor(0xFFFF0000); // Solid red
            centerDotPaint.setAntiAlias(true);

            setupAnimations();
        }

        private void setupAnimations() {
            // Scale animation for the main circle
            scaleAnimator = ValueAnimator.ofFloat(0.8f, 1.2f);
            scaleAnimator.setDuration(1500);
            scaleAnimator.setRepeatCount(ValueAnimator.INFINITE);
            scaleAnimator.setRepeatMode(ValueAnimator.REVERSE);
            scaleAnimator.setInterpolator(new AccelerateDecelerateInterpolator());

            scaleAnimator.addUpdateListener(animation -> {
                animationScale = (float) animation.getAnimatedValue();
                if (mapView != null) {
                    mapView.invalidate();
                }
            });

            // Pulse animation for the outer ring
            pulseAnimator = ValueAnimator.ofFloat(1.0f, 2.5f);
            pulseAnimator.setDuration(2000);
            pulseAnimator.setRepeatCount(ValueAnimator.INFINITE);
            pulseAnimator.setRepeatMode(ValueAnimator.RESTART);
            pulseAnimator.setInterpolator(new AccelerateDecelerateInterpolator());

            pulseAnimator.addUpdateListener(animation -> {
                pulseScale = (float) animation.getAnimatedValue();
                if (mapView != null) {
                    mapView.invalidate();
                }
            });

            scaleAnimator.start();
            pulseAnimator.start();
        }

        @Override
        public void draw(Canvas c, MapView osmv, boolean shadow) {
            if (getMyLocation() != null) {
                Point screenCoords = new Point();
                osmv.getProjection().toPixels(getMyLocation(), screenCoords);

                // Draw pulsing outer ring (red)
                float pulseRadius = 50 * pulseScale;
                int pulseAlpha = (int) (80 * (2.5f - pulseScale) / 1.5f); // Fade out as it expands
                pulsePaint.setAlpha(Math.max(0, Math.min(255, pulseAlpha)));
                c.drawCircle(screenCoords.x, screenCoords.y, pulseRadius, pulsePaint);

                // Draw animated inner circle (red)
                float innerRadius = 35 * animationScale;
                int innerAlpha = (int) (120 * (2.0f - animationScale)); // Fade effect
                animatedPaint.setAlpha(Math.max(50, Math.min(255, innerAlpha)));
                c.drawCircle(screenCoords.x, screenCoords.y, innerRadius, animatedPaint);

                // Draw solid center dot (red)
                c.drawCircle(screenCoords.x, screenCoords.y, 8, centerDotPaint);
            }

            // DO NOT call super.draw() - this prevents the triangle from being drawn
            // super.draw(c, osmv, shadow); // This line is commented out to remove the triangle
        }

        public void stopAnimation() {
            if (scaleAnimator != null) {
                scaleAnimator.cancel();
            }
            if (pulseAnimator != null) {
                pulseAnimator.cancel();
            }
        }

        public void startAnimation() {
            if (scaleAnimator != null && !scaleAnimator.isRunning()) {
                scaleAnimator.start();
            }
            if (pulseAnimator != null && !pulseAnimator.isRunning()) {
                pulseAnimator.start();
            }
        }

        // Optional: Customize animation speed
        public void setAnimationSpeed(long durationMs) {
            if (scaleAnimator != null) {
                scaleAnimator.setDuration(durationMs);
            }
            if (pulseAnimator != null) {
                pulseAnimator.setDuration(durationMs + 500); // Pulse slightly slower
            }
        }

        // Optional: Customize colors
        public void setAnimationColors(int innerColor, int outerColor) {
            if (animatedPaint != null) {
                animatedPaint.setColor(innerColor);
            }
            if (pulsePaint != null) {
                pulsePaint.setColor(outerColor);
            }
        }

        // Optional: Customize center dot color
        public void setCenterDotColor(int color) {
            if (centerDotPaint != null) {
                centerDotPaint.setColor(color);
            }
        }
    }
}
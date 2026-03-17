function startLiveCAN(onFrame) {
    while (true) {
        const frame = readFromKvaser();

        const parsed = {
        timestamp_ms: frame.timestamp,
        id: frame.id,
        data: frame.data
    };
    
    onFrame(parsed);
  }
}

module.exports = { startLiveCAN };
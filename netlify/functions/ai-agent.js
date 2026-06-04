exports.handler = async function(event) {
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ advice: 'Pick one high-priority task that fits your available time, then start a 25-minute focus sprint.' }) };
};
